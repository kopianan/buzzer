"""
Buzzer Detector - Configuration
Load dari environment variables dengan defaults.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # AI Provider: none, claude, openai
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "none").lower()
    # Support both AI_API_KEY and provider-specific keys
    AI_API_KEY: str = os.getenv("AI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
    # Model defaults
    AI_MODEL: str = os.getenv("AI_MODEL") or "claude-sonnet-4-6"
    # Score range yang dikirim ke AI (ambiguous zone)
    AI_THRESHOLD_MIN: int = int(os.getenv("AI_THRESHOLD_MIN", "20"))
    AI_THRESHOLD_MAX: int = int(os.getenv("AI_THRESHOLD_MAX", "60"))
    # Komentar per batch API call (hemat token)
    AI_BATCH_SIZE: int = int(os.getenv("AI_BATCH_SIZE", "15"))
    # Max komentar yang dikirim ke AI per request
    AI_MAX_COMMENTS: int = int(os.getenv("AI_MAX_COMMENTS", "100"))

    @classmethod
    def ai_enabled(cls) -> bool:
        return cls.AI_PROVIDER in ("claude", "openai") and bool(cls.AI_API_KEY)

    @classmethod
    def status(cls) -> dict:
        return {
            "ai_provider": cls.AI_PROVIDER,
            "ai_enabled": cls.ai_enabled(),
            "ai_model": cls.AI_MODEL if cls.ai_enabled() else None,
            "ai_threshold_min": cls.AI_THRESHOLD_MIN,
            "ai_threshold_max": cls.AI_THRESHOLD_MAX,
            "ai_batch_size": cls.AI_BATCH_SIZE,
        }


config = Config()
