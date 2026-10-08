from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict

API_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=API_DIR / ".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = ""
    gemini_fallback_model: str = ""
    groq_api_key: str = ""
    groq_model: str = ""
    firebase_project_id: str = ""
    firebase_web_api_key: str = ""
    firebase_credentials: str = "secrets/firebase-admin.json"
    auth_disabled: bool = False
    cors_origins: str = "http://localhost:3000"
    llm_cache_dir: Path = API_DIR / ".cache" / "llm"

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        # api/.env wins over OS variables, so a stale machine-wide key can't shadow the project's.
        return init_settings, dotenv_settings, env_settings, file_secret_settings

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def credentials_path(self) -> Path:
        path = Path(self.firebase_credentials)
        return path if path.is_absolute() else API_DIR / path


@lru_cache
def get_settings() -> Settings:
    return Settings()
