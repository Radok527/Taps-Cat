from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://tami:tami@localhost:5432/tami"
    REDIS_URL: str = "redis://localhost:6379/0"
    MINIMAX_API_KEY: str = ""
    MINIMAX_GROUP_ID: str = ""
    IMAGES_DIR: str = "/images"
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
