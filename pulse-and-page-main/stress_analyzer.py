"""Turn a wearable snapshot into a wellbeing state and audio brief.

This is a wellbeing recommendation heuristic, not a medical diagnosis.

Scoring model
-------------
Every signal contributes a *continuous* amount to one of two indices instead
of an all-or-nothing point.  That matters for the simulator: with the old
integer point system most slider movement produced no visible change, and the
reachable band collapsed to two states.  Now each slider moves the index
smoothly, and a single slider pushed far enough can carry the state on its own.

  stress_index    0-100   how activated / strained the body looks
  recovery_index  0-100   how rested and parasympathetic it looks
"""
from collections import deque
from typing import Optional, Dict, List, Any, Tuple

# stress_index thresholds
HIGH_STRESS_AT = 45
ELEVATED_AT = 22
# recovery_index threshold (only applied when stress is below ELEVATED_AT)
RECOVERY_AT = 38
# cadence (steps/min) at or above this counts as physically active
ACTIVE_CADENCE = 105


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


class StressAnalyzer:
    def __init__(self, baseline_hr: int = 70, baseline_hrv: float = 45, smoothing_window: int = 5):
        self.baseline_hr = float(baseline_hr or 70)
        self.baseline_hrv = float(baseline_hrv or 45)
        self.window = deque(maxlen=smoothing_window)

    # --- compatibility with the original simple interface -----------------
    def classify(self, bpm: int, is_active: bool = False, spo2: Optional[float] = None) -> str:
        return self.assess({"heart_rate": bpm, "is_active": is_active, "spo2": spo2})["state"]

    # --- scoring ----------------------------------------------------------
    def _stress_terms(self, m: Dict[str, Any], avg_bpm: Optional[float]) -> List[Tuple[str, float, str]]:
        """(name, weighted points, human reason) for every stress contributor."""
        terms: List[Tuple[str, float, str]] = []

        if avg_bpm is not None:
            # full weight once HR is 60% above the personal resting baseline
            load = _clamp((avg_bpm - self.baseline_hr) / (self.baseline_hr * 0.60))
            if load > 0:
                pct = int(round((avg_bpm - self.baseline_hr) / self.baseline_hr * 100))
                terms.append(("heart_rate", load * 45,
                              f"Heart rate is {pct}% above the personal resting baseline."))

        hrv = m.get("hrv")
        if hrv is not None:
            deficit = _clamp((self.baseline_hrv - hrv) / (self.baseline_hrv * 0.70))
            if deficit > 0:
                terms.append(("hrv", deficit * 30,
                              "HRV is below the personal baseline, a common strain signal."))

        recovery_score = m.get("recovery_score")
        if recovery_score is not None:
            deficit = _clamp((65 - recovery_score) / 65.0)
            if deficit > 0:
                terms.append(("recovery_score", deficit * 18,
                              "Wearable recovery score is under the rested range."))

        sleep_minutes = m.get("sleep_minutes")
        if sleep_minutes is not None:
            deficit = _clamp((420 - sleep_minutes) / 240.0)
            if deficit > 0:
                terms.append(("sleep_minutes", deficit * 12,
                              "Sleep was short compared with a full night."))

        spo2 = m.get("spo2")
        if spo2 is not None:
            deficit = _clamp((96 - spo2) / 8.0)
            if deficit > 0:
                terms.append(("spo2", deficit * 10,
                              "Blood-oxygen reading is below the usual wellness range."))

        respiratory_rate = m.get("respiratory_rate")
        if respiratory_rate is not None:
            excess = _clamp((respiratory_rate - 16) / 10.0)
            if excess > 0:
                terms.append(("respiratory_rate", excess * 8,
                              "Breathing is faster than a settled resting rate."))

        return terms

    def _recovery_terms(self, m: Dict[str, Any], avg_bpm: Optional[float]) -> List[Tuple[str, float, str]]:
        terms: List[Tuple[str, float, str]] = []

        hrv = m.get("hrv")
        if hrv is not None:
            surplus = _clamp((hrv - self.baseline_hrv) / (self.baseline_hrv * 0.50))
            if surplus > 0:
                terms.append(("hrv", surplus * 35, "HRV is above the personal baseline."))

        recovery_score = m.get("recovery_score")
        if recovery_score is not None:
            surplus = _clamp((recovery_score - 65) / 35.0)
            if surplus > 0:
                terms.append(("recovery_score", surplus * 30, "Wearable recovery score is high."))

        sleep_minutes = m.get("sleep_minutes")
        if sleep_minutes is not None:
            surplus = _clamp((sleep_minutes - 420) / 180.0)
            if surplus > 0:
                terms.append(("sleep_minutes", surplus * 15, "Sleep duration was generous."))

        respiratory_rate = m.get("respiratory_rate")
        if respiratory_rate is not None:
            surplus = _clamp((14 - respiratory_rate) / 6.0)
            if surplus > 0:
                terms.append(("respiratory_rate", surplus * 10,
                              "Slow breathing suggests wind-down or sleep readiness."))

        if avg_bpm is not None:
            surplus = _clamp((self.baseline_hr - avg_bpm) / (self.baseline_hr * 0.20))
            if surplus > 0:
                terms.append(("heart_rate", surplus * 10, "Heart rate is below the resting baseline."))

        steps = m.get("steps")
        if steps is not None and steps < 400 and avg_bpm is not None and avg_bpm <= self.baseline_hr * 1.05:
            terms.append(("steps", 8.0, "Low movement with a resting heart rate suggests a rest period."))

        return terms

    # --- main entry point -------------------------------------------------
    def assess(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        bpm = metrics.get("heart_rate")
        cadence = metrics.get("cadence")
        is_active = bool(metrics.get("is_active"))

        if bpm is not None:
            self.window.append(bpm)
            avg_bpm = sum(self.window) / float(len(self.window))
        else:
            avg_bpm = None

        stress_terms = self._stress_terms(metrics, avg_bpm)
        recovery_terms = self._recovery_terms(metrics, avg_bpm)

        stress_index = round(min(100.0, sum(points for _, points, _ in stress_terms)), 1)
        recovery_index = round(min(100.0, sum(points for _, points, _ in recovery_terms)), 1)

        physically_active = is_active or (cadence is not None and cadence >= ACTIVE_CADENCE)

        if physically_active:
            state = mode = "active"
            reasons = ["Movement data indicates a workout or brisk activity; "
                       "suggesting energetic Rom-Com listening."]
            if cadence:
                reasons.append(f"Cadence is {int(cadence)} steps per minute.")
        elif stress_index >= HIGH_STRESS_AT:
            state = mode = "high_stress"
            reasons = [r for _, _, r in sorted(stress_terms, key=lambda t: -t[1])][:3]
        elif stress_index >= ELEVATED_AT:
            state = mode = "elevated"
            reasons = [r for _, _, r in sorted(stress_terms, key=lambda t: -t[1])][:3]
        elif recovery_index >= RECOVERY_AT:
            state = mode = "recovery"
            reasons = [r for _, _, r in sorted(recovery_terms, key=lambda t: -t[1])][:3]
        else:
            state = mode = "normal"
            reasons = ["All tracked signals sit close to the personal baseline; "
                       "using a balanced, upbeat listening mode."]

        if not reasons:
            reasons = ["Not enough signals for a strong inference; using a balanced listening mode."]

        return self._result(
            state, mode, reasons, metrics, stress_index, recovery_index,
            [{"signal": n, "points": round(p, 1)} for n, p, _ in sorted(stress_terms, key=lambda t: -t[1])],
            [{"signal": n, "points": round(p, 1)} for n, p, _ in sorted(recovery_terms, key=lambda t: -t[1])],
        )

    @staticmethod
    def _result(state, mode, reasons, metrics, stress_index, recovery_index,
                stress_breakdown, recovery_breakdown) -> Dict[str, Any]:
        labels = {
            "high_stress": "High stress / anxious signals",
            "elevated": "Elevated stress",
            "normal": "Balanced / normal",
            "recovery": "Recovery / post-workout",
            "active": "Physically active",
        }
        voice_profiles = {
            "high_stress": {"label": "Calming low voice", "pitch": "lower", "pace": "slow",
                            "processing": "soft, low and slow delivery with long pauses to bring the body down"},
            "elevated": {"label": "Warm settling voice", "pitch": "slightly lower", "pace": "measured",
                         "processing": "gentle pitch and measured pace to restore the normal baseline"},
            "normal": {"label": "Bright energetic voice", "pitch": "natural", "pace": "lively",
                       "processing": "upbeat, expressive delivery to lift energy and mood"},
            "recovery": {"label": "Lighthearted humorous voice", "pitch": "bright", "pace": "relaxed",
                         "processing": "warm, playful delivery to induce laughter while the body recovers"},
            "active": {"label": "Energetic Rom-Com voice", "pitch": "brighter", "pace": "brisk",
                       "processing": "brisk and sparkling delivery that matches workout tempo"},
        }
        return {
            "state": state,
            "state_label": labels[state],
            "mode": mode,
            "reasons": reasons,
            "voice_profile": voice_profiles[state],
            "stress_index": stress_index,
            "recovery_index": recovery_index,
            "stress_breakdown": stress_breakdown,
            "recovery_breakdown": recovery_breakdown,
            "thresholds": {"elevated": ELEVATED_AT, "high_stress": HIGH_STRESS_AT, "recovery": RECOVERY_AT},
            "metrics_used": [k for k, v in metrics.items() if v is not None and k != "source"],
        }
