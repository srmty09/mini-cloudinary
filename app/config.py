from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    database_url: str
    jwt_secret: str
    jwt_expire_hours: int = 24
    r2_endpoint: Optional[str] = None
    r2_access_key: Optional[str] = None
    r2_secret_key: Optional[str] = None
    r2_bucket: Optional[str] = None


settings = Settings()
