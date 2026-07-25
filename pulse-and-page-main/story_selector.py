"""Recommendation intent and narration direction for each wellbeing state."""
import random
from typing import Optional, Dict, Any

LISTENING_PROFILES = {
    "restore": {"label": "Restore", "genres": ["sleep stories", "gentle nature writing", "low-stakes comedy"],
                "narration_style": "slow, soft, low and reassuring"},
    "settle": {"label": "Settle", "genres": ["warm dramas", "cozy fiction", "light comedy"],
               "narration_style": "warm, measured and gently reassuring"},
    "laugh": {"label": "Recover", "genres": ["comic novels", "witty satire", "gentle humour"],
              "narration_style": "relaxed, playful and comedic"},
    "everyday": {"label": "Explore", "genres": ["adventure", "mystery", "classic fiction"],
                 "narration_style": "bright, lively and expressive"},
    "workout": {"label": "Move", "genres": ["rom-com", "fast-paced adventure", "upbeat comedy"],
                "narration_style": "energetic, bright and brisk"},
}

# wellbeing state -> listening profile
STATE_PROFILE = {
    "high_stress": "restore",
    "restore": "restore",
    "elevated": "settle",
    "settle": "settle",
    "recovery": "laugh",
    "calm": "laugh",
    "normal": "everyday",
    "everyday": "everyday",
    "focus": "everyday",
    "active": "workout",
    "workout": "workout",
}


def recommend(state: str, mode: Optional[str] = None) -> Dict[str, Any]:
    key = STATE_PROFILE.get(mode or "", STATE_PROFILE.get(state, "everyday"))
    profile = LISTENING_PROFILES[key]
    return {"mode": mode or state, "profile": profile,
            "story": random.choice(profile["genres"]),
            "narration_style": profile["narration_style"]}
