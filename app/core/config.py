import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriSphere AI Grading Agent"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    # Groq API Configuration (Multimodal Vision & Reasoning)
    GROQ_API_KEY: str = ""
    GROQ_VISION_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_TEXT_MODEL: str = "qwen/qwen3.8-27b"
    
    # data.gov.in Agmarknet API Configuration
    AGMARKNET_API_KEY: str = ""
    DATA_GOV_IN_API_KEY: str = ""
    AGMARKNET_RESOURCE_ID: str = "9ef84268-d588-465a-a308-a864a43d0070"
    DATA_GOV_IN_BASE_URL: str = "https://api.data.gov.in/resource"

    @property
    def effective_agmarknet_api_key(self) -> str:
        """
        Reads at runtime from AGMARKNET_API_KEY (matching Supabase Edge Function secret standard)
        with fallback to DATA_GOV_IN_API_KEY or OS environment variable.
        """
        return (
            os.environ.get("AGMARKNET_API_KEY")
            or self.AGMARKNET_API_KEY
            or os.environ.get("DATA_GOV_IN_API_KEY")
            or self.DATA_GOV_IN_API_KEY
            or ""
        ).strip()

    # Image upload constraints
    MAX_IMAGE_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp", "image/jpg"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
