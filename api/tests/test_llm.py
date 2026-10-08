import pytest
from google.genai import errors as genai_errors

from app import llm
from app.errors import ApiError

PNG = llm.Image(b"\x89PNG", "image/png")


class FakeGemini:
    def __init__(self, behaviour):
        self.calls = 0
        self.models_used: list[str] = []
        self._behaviour = behaviour
        self.models = self

    def generate_content(self, **kwargs):
        self.calls += 1
        self.models_used.append(kwargs["model"])
        return self._behaviour(self.calls)


class Reply:
    def __init__(self, text):
        self.text = text


class FakeGroq:
    def __init__(self, text="groq says hi"):
        self.calls = 0
        self._text = text
        self.chat = self
        self.completions = self

    def create(self, **kwargs):
        self.calls += 1
        message = type("M", (), {"content": self._text})
        return type("R", (), {"choices": [type("C", (), {"message": message})]})


def fail_with(code):
    def behaviour(_call):
        error_class = genai_errors.ClientError if code < 500 else genai_errors.ServerError
        raise error_class(code, {"error": {"message": "boom", "status": "ERR"}})

    return behaviour


rate_limited = fail_with(429)
unavailable = fail_with(503)


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    monkeypatch.setattr(llm, "_sleep", lambda s: None)


def use(monkeypatch, gemini=None, groq_client=None):
    if gemini is not None:
        monkeypatch.setattr(llm, "_gemini_client", lambda s: gemini)
    monkeypatch.setattr(
        llm, "_groq_client", (lambda s: groq_client) if groq_client else lambda s: pytest.fail("groq must not be used")
    )


# --- cache -----------------------------------------------------------------


def test_second_identical_call_is_cached(settings, monkeypatch):
    gemini = FakeGemini(lambda n: Reply("hello"))
    use(monkeypatch, gemini)

    first = llm.generate("ping", settings=settings)
    second = llm.generate("ping", settings=settings)

    assert (first.cached, second.cached) == (False, True)
    assert second.text == "hello" and second.provider == "gemini"
    assert gemini.calls == 1


def test_different_temperature_is_a_cache_miss(settings, monkeypatch):
    gemini = FakeGemini(lambda n: Reply("hello"))
    use(monkeypatch, gemini)
    llm.generate("ping", temperature=0.0, settings=settings)
    llm.generate("ping", temperature=0.7, settings=settings)
    assert gemini.calls == 2


# --- retry on 429 / 5xx ------------------------------------------------------


@pytest.mark.parametrize("code", [429, 500, 502, 503, 504])
def test_every_retryable_status_is_retried(settings, monkeypatch, code):
    def flaky(n):
        if n == 1:
            fail_with(code)(n)
        return Reply("ok")

    gemini = FakeGemini(flaky)
    use(monkeypatch, gemini)
    assert llm.generate(f"ping {code}", settings=settings).provider == "gemini"
    assert gemini.calls == 2


def test_503_then_success(settings, monkeypatch):
    gemini = FakeGemini(lambda n: unavailable(n) if n == 1 else Reply("recovered"))
    use(monkeypatch, gemini)
    result = llm.generate("ping", settings=settings)
    assert (result.text, result.provider) == ("recovered", "gemini")
    assert gemini.calls == 2


def test_non_retryable_status_fails_immediately(settings, monkeypatch):
    gemini = FakeGemini(fail_with(401))
    use(monkeypatch, gemini)
    with pytest.raises(ApiError) as err:
        llm.generate("ping", settings=settings)
    assert err.value.code == "llm_failed" and gemini.calls == 1


def test_backoff_grows_with_jitter(settings, monkeypatch):
    delays = []
    monkeypatch.setattr(llm, "_sleep", delays.append)
    use(monkeypatch, FakeGemini(unavailable), FakeGroq())
    llm.generate("ping", settings=settings)
    assert len(delays) == llm.MAX_TRIES - 1
    for attempt, delay in enumerate(delays):
        base = llm.BACKOFF_SECONDS * 2**attempt
        assert base <= delay <= base * (1 + llm.JITTER)


# --- fallback to Groq (text) / error (image) ---------------------------------


@pytest.mark.parametrize("failure", [rate_limited, unavailable])
def test_exhausted_retries_fall_back_to_groq_for_text(settings, monkeypatch, failure):
    gemini, fallback = FakeGemini(failure), FakeGroq()
    use(monkeypatch, gemini, fallback)

    result = llm.generate("ping", settings=settings)

    assert result.provider == "groq" and result.text == "groq says hi"
    assert gemini.calls == llm.MAX_TRIES
    assert fallback.calls == 1


@pytest.mark.parametrize("failure", [rate_limited, unavailable])
def test_exhausted_retries_raise_clear_error_for_image(settings, monkeypatch, failure):
    gemini = FakeGemini(failure)
    use(monkeypatch, gemini)
    with pytest.raises(ApiError) as err:
        llm.generate("read this", image=PNG, settings=settings)
    assert err.value.code == "llm_failed"
    assert "image" in err.value.message and "fallback" in err.value.message
    assert gemini.calls == llm.MAX_TRIES


def test_no_groq_key_means_no_fallback(settings, monkeypatch):
    settings.groq_api_key = ""
    use(monkeypatch, FakeGemini(rate_limited))
    with pytest.raises(ApiError) as err:
        llm.generate("ping", settings=settings)
    assert err.value.code == "llm_failed"


# --- GEMINI_FALLBACK_MODEL ----------------------------------------------------


def test_fallback_model_is_tried_once_before_groq(settings, monkeypatch):
    settings.gemini_fallback_model = "gemini-backup"
    gemini = FakeGemini(lambda n: unavailable(n) if n <= llm.MAX_TRIES else Reply("from backup"))
    use(monkeypatch, gemini)
    result = llm.generate("ping", settings=settings)
    assert (result.text, result.provider, result.model) == ("from backup", "gemini", "gemini-backup")
    assert gemini.models_used == ["gemini-test"] * llm.MAX_TRIES + ["gemini-backup"]


def test_fallback_model_works_for_images_too(settings, monkeypatch):
    settings.gemini_fallback_model = "gemini-backup"
    gemini = FakeGemini(lambda n: unavailable(n) if n <= llm.MAX_TRIES else Reply("seen"))
    use(monkeypatch, gemini)
    assert llm.generate("read", image=PNG, settings=settings).model == "gemini-backup"


def test_fallback_model_failing_then_groq_for_text(settings, monkeypatch):
    settings.gemini_fallback_model = "gemini-backup"
    gemini, fallback = FakeGemini(unavailable), FakeGroq()
    use(monkeypatch, gemini, fallback)
    assert llm.generate("ping", settings=settings).provider == "groq"
    assert gemini.models_used.count("gemini-backup") == 1


def test_fallback_model_failing_for_image_raises(settings, monkeypatch):
    settings.gemini_fallback_model = "gemini-backup"
    gemini = FakeGemini(unavailable)
    use(monkeypatch, gemini)
    with pytest.raises(ApiError) as err:
        llm.generate("read", image=PNG, settings=settings)
    assert err.value.code == "llm_failed"
    assert gemini.models_used[-1] == "gemini-backup"


# --- logging ---------------------------------------------------------------------


def test_retry_logs_have_status_only_no_prompt_or_key(settings, monkeypatch, caplog):
    caplog.set_level("INFO", logger="api.llm")
    use(monkeypatch, FakeGemini(unavailable), FakeGroq())
    llm.generate("SECRET-PROMPT-TEXT", settings=settings)
    text = caplog.text
    assert "status=503" in text and "retry 1/2" in text and "falling back to groq" in text
    assert "SECRET-PROMPT-TEXT" not in text
    assert settings.gemini_api_key not in text and settings.groq_api_key not in text


# --- endpoint ----------------------------------------------------------------------


def test_ping_endpoint_reports_cached(client, monkeypatch):
    use(monkeypatch, FakeGemini(lambda n: Reply(" Working fine. ")))
    headers = {"X-Dev-Uid": "u1"}
    first = client.get("/llm/ping", headers=headers).json()
    second = client.get("/llm/ping", headers=headers).json()
    assert first == {"model": "gemini-test", "reply": "Working fine.", "cached": False}
    assert second["cached"] is True
