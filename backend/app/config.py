from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    dhanhq_app_id: str = ""
    dhanhq_app_secret: str = ""
    dhanhq_client_id: str = ""
    dhanhq_redirect_url: str = "http://localhost:8000/api/auth/dhan/callback"
    dhanhq_base_url: str = "https://api.dhan.co/v2"
    dhanhq_auth_url: str = "https://auth.dhan.co"

    nifty_security_id: int = 13
    nifty_exchange_segment: str = "IDX_I"

    environment: str = "development"
    debug: bool = True

    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
