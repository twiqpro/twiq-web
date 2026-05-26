from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            _BACKEND_DIR / ".env",
            _REPO_ROOT / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "TWIQ Web"
    environment: str = "development"
    debug: bool = True

    # DhanHQ API (manual token mode)
    # Provide a valid access token + client id directly in backend/.env
    # (avoids API key + secret OAuth flow).
    dhanhq_access_token: str = ""
    dhanhq_client_id: str = ""
    dhanhq_base_url: str = "https://api.dhan.co/v2"

    # Nifty 50 index — Dhan SECURITY_ID 13
    nifty_security_id: str = "13"
    nifty_exchange_segment: str = "IDX_I"
    nifty_instrument: str = "INDEX"
    nifty_default_interval: str = "5M"

    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = (
        "https://twiqpro.netlify.app,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def dhanhq_credentials_configured(self) -> bool:
        return bool(self.dhanhq_access_token and self.dhanhq_client_id)


@lru_cache
def get_settings() -> Settings:
    return Settings()
