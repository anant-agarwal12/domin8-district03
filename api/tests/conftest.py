from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth import get_db
from app.config import Settings, get_settings
from app.main import app
from app.memdb import MemDb


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        auth_disabled=True,
        gemini_api_key="g-key",
        gemini_model="gemini-test",
        groq_api_key="q-key",
        groq_model="groq-test",
        llm_cache_dir=tmp_path / "llm",
    )


@pytest.fixture
def db() -> MemDb:
    return MemDb()


@pytest.fixture
def client(settings: Settings, db: MemDb):
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def fake_llm(monkeypatch):
    from app import llm
    from tests.helpers import ScriptedLlm

    scripted = ScriptedLlm()
    monkeypatch.setattr(llm, "generate", scripted)
    return scripted
