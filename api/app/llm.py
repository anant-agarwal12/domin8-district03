"""The only module that calls a model (DECISIONS.md D-001, D-002).

Gemini is primary. On rate-limit errors we retry with backoff, then fall back to Groq
for text-only calls. Every result is cached on disk by a hash of the input.
"""
import hashlib
import json
import logging
import random
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Callable

import groq
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import Settings, get_settings
from app.errors import ApiError

log = logging.getLogger("api.llm")

MAX_TRIES = 3
BACKOFF_SECONDS = 1.0
JITTER = 0.25  # up to +25% random delay on each backoff
RETRYABLE_STATUSES = {429, 500, 502, 503, 504}

_sleep = time.sleep


@dataclass(frozen=True)
class Image:
    data: bytes
    mime_type: str


@dataclass(frozen=True)
class LlmResult:
    text: str
    provider: str  # "gemini" | "groq"
    model: str
    cached: bool = False

    def json(self) -> Any:
        return json.loads(self.text)


def generate(
    prompt: str,
    *,
    image: Image | None = None,
    schema: dict[str, Any] | None = None,
    temperature: float = 0.0,
    cache_salt: str = "",
    settings: Settings | None = None,
) -> LlmResult:
    """Text (or text + image) generation. `schema` is a JSON schema for structured output.

    `cache_salt` changes the cache key without changing the prompt, so a deliberate second call
    (a second grading, a retry after bad output) is not answered from the cache.
    """
    settings = settings or get_settings()
    if not settings.gemini_api_key or not settings.gemini_model:
        raise ApiError("llm_failed", "GEMINI_API_KEY and GEMINI_MODEL must be set")

    path = _cache_path(settings, prompt, image, schema, temperature, cache_salt)
    hit = _cache_read(path)
    if hit:
        return hit

    result = _call_with_fallback(prompt, image, schema, temperature, settings)
    _cache_write(path, result)
    return result


def _cache_path(
    settings: Settings,
    prompt: str,
    image: Image | None,
    schema: dict[str, Any] | None,
    temperature: float,
    cache_salt: str,
) -> Path:
    digest = hashlib.sha256()
    for part in (
        settings.gemini_model,
        prompt,
        json.dumps(schema, sort_keys=True),
        repr(temperature),
        cache_salt,
    ):
        digest.update(part.encode())
        digest.update(b"\0")
    digest.update(image.data if image else b"")
    return settings.llm_cache_dir / f"{digest.hexdigest()}.json"


def _cache_read(path: Path) -> LlmResult | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return LlmResult(**{**data, "cached": True})
    except (OSError, ValueError, TypeError):
        return None


def _cache_write(path: Path, result: LlmResult) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(asdict(result)), encoding="utf-8")


def _call_with_fallback(
    prompt: str, image: Image | None, schema: dict[str, Any] | None, temperature: float, settings: Settings
) -> LlmResult:
    primary = settings.gemini_model
    try:
        return _retrying("gemini", lambda: _call_gemini(primary, prompt, image, schema, temperature, settings))
    except genai_errors.APIError as exc:
        if exc.code not in RETRYABLE_STATUSES:
            raise ApiError("llm_failed", f"Gemini call failed (status {exc.code})") from exc
        failure = exc

    backup = settings.gemini_fallback_model
    if backup and backup != primary:
        log.info("provider=gemini status=%s switching to fallback model", failure.code)
        try:
            return _call_gemini(backup, prompt, image, schema, temperature, settings)
        except genai_errors.APIError as exc:
            log.info("provider=gemini fallback model failed status=%s", exc.code)
            failure = exc

    if image is not None:
        raise ApiError(
            "llm_failed",
            f"Gemini is unavailable (status {failure.code}) and image calls have no text-only fallback; try again shortly",
        ) from failure
    if not (settings.groq_api_key and settings.groq_model):
        raise ApiError("llm_failed", f"Gemini is unavailable (status {failure.code}) and no Groq fallback is configured") from failure

    log.info("provider=gemini status=%s falling back to groq", failure.code)
    try:
        return _retrying("groq", lambda: _call_groq(prompt, schema, temperature, settings))
    except groq.APIError as exc:
        raise ApiError("llm_failed", f"Groq fallback failed: {type(exc).__name__}") from exc


def _retrying(provider: str, call: Callable[[], LlmResult]) -> LlmResult:
    for attempt in range(1, MAX_TRIES + 1):
        try:
            return call()
        except Exception as exc:
            status = _status_code(exc)
            if status not in RETRYABLE_STATUSES or attempt == MAX_TRIES:
                raise
            log.info("provider=%s status=%s retry %d/%d", provider, status, attempt, MAX_TRIES - 1)
            delay = BACKOFF_SECONDS * 2 ** (attempt - 1)
            _sleep(delay + random.uniform(0, delay * JITTER))
    raise AssertionError("unreachable")


def _status_code(exc: BaseException) -> int | None:
    if isinstance(exc, genai_errors.APIError):
        return exc.code
    if isinstance(exc, groq.APIStatusError):
        return exc.status_code
    return None


def _gemini_client(settings: Settings) -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _groq_client(settings: Settings) -> groq.Groq:
    return groq.Groq(api_key=settings.groq_api_key)


def _call_gemini(
    model: str,
    prompt: str,
    image: Image | None,
    schema: dict[str, Any] | None,
    temperature: float,
    settings: Settings,
) -> LlmResult:
    config = types.GenerateContentConfig(temperature=temperature)
    if schema is not None:
        config.response_mime_type = "application/json"
        config.response_json_schema = schema
    contents: list[Any] = [prompt]
    if image is not None:
        contents.insert(0, types.Part.from_bytes(data=image.data, mime_type=image.mime_type))
    client = _gemini_client(settings)  # keep a reference: a collected Client closes its HTTP session
    response = client.models.generate_content(model=model, contents=contents, config=config)
    return LlmResult(text=response.text or "", provider="gemini", model=model)


def _call_groq(prompt: str, schema: dict[str, Any] | None, temperature: float, settings: Settings) -> LlmResult:
    kwargs: dict[str, Any] = {}
    if schema is not None:
        prompt = f"{prompt}\n\nReply with JSON only, matching this JSON schema:\n{json.dumps(schema)}"
        kwargs["response_format"] = {"type": "json_object"}
    client = _groq_client(settings)
    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        **kwargs,
    )
    return LlmResult(text=response.choices[0].message.content or "", provider="groq", model=settings.groq_model)
