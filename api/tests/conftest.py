from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth import get_db
from app.config import Settings, get_settings
from app.main import app


class FakeSnapshot:
    def __init__(self, data: dict | None) -> None:
        self._data = data
        self.exists = data is not None

    def to_dict(self) -> dict | None:
        return self._data


class FakeDoc:
    def __init__(self, store: dict, key: str) -> None:
        self._store, self._key = store, key

    def get(self) -> FakeSnapshot:
        return FakeSnapshot(self._store.get(self._key))

    def set(self, data: dict) -> None:
        self._store[self._key] = data


class FakeDb:
    def __init__(self) -> None:
        self.docs: dict[str, dict] = {}

    def collection(self, name: str) -> "FakeDb":
        return self

    def document(self, key: str) -> FakeDoc:
        return FakeDoc(self.docs, key)


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
def db() -> FakeDb:
    return FakeDb()


@pytest.fixture
def client(settings: Settings, db: FakeDb):
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()
