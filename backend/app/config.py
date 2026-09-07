from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    moss_project_id: str = ""
    moss_project_key: str = ""
    groq_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()