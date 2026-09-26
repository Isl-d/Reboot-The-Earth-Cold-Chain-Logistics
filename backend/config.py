"""Single place for every tunable number in the Person 3 data platform.

Nothing here is a secret. Every value can be overridden with a ``CC_*``
environment variable (see ``.env.example``) so the same image runs on a
laptop and inside docker compose.
"""
from __future__ import annotations

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CC_", env_file=".env", extra="ignore")

    app_name: str = "Thermal Trace"

    # --- infrastructure ---------------------------------------------------
    mqtt_host: str = "localhost"
    mqtt_port: int = 1883
    mqtt_client_id: str = "coldchain-backend"
    telemetry_topic: str = "coldchain/trucks/+/telemetry"
    events_topic: str = "coldchain/trucks/+/events"
    control_topic: str = "coldchain/control/{truck_id}"
    database_url: str = "postgresql+psycopg://coldchain:coldchain@localhost:5432/coldchain"
    redis_url: str = "redis://localhost:6379/0"
    timescale_enabled: bool = True
    cors_origins: str = "*"

    # --- simulator cadence ------------------------------------------------
    reading_interval_s: float = 3.0

    # --- validation -------------------------------------------------------
    min_plausible_temp_c: float = -60.0
    max_plausible_temp_c: float = 80.0
    max_clock_skew_future_s: float = 120.0
    max_clock_skew_past_s: float = 7 * 24 * 3600.0

    # --- baseline risk bands (Person 4 may override per truck) ------------
    risk_low_max: float = 25.0
    risk_medium_max: float = 50.0
    risk_high_max: float = 75.0

    # --- incident rules ---------------------------------------------------
    gforce_shock_threshold: float = 1.0
    gforce_hard_shock: float = 2.0
    door_open_incident_s: float = 15.0
    traffic_speed_threshold: float = 10.0

    # --- derived physics --------------------------------------------------
    ambient_temp_c: float = 38.0
    # A reading is "stale" on the map after this many seconds without one.
    stale_after_s: float = 30.0

    # --- intelligence engine (Person 4), deterministic core ---------------
    intelligence_enabled: bool = True
    intelligence_interval_s: float = 5.0
    intelligence_telemetry_window: int = 120

    # --- LLM (System 2) explainer --------------------------------------------
    llm_model: str = "openrouter/free"
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_timeout_s: float = 30.0
    llm_max_tokens: int = 320
    # The model may only move a deterministic estimate by this much.
    llm_probability_band: float = 0.35
    # The background worker calls the LLM at most once this often per truck, so
    # a 5 s evaluation loop cannot rate-limit the provider.
    llm_min_interval_s: float = 45.0
    # Not CC_-prefixed because the key is shared with the wider toolchain.
    # Reads OPENROUTERAPIKEY from the environment or .env.
    openrouter_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("OPENROUTERAPIKEY", "OPENROUTER_API_KEY",
                                      "CC_OPENROUTER_API_KEY"),
    )

    # --- deterioration model (Arrhenius) ----------------------------------
    gas_constant_j_mol_k: float = 8.314
    # Fallback activation energy when a product has none of its own.
    activation_energy_default_j_mol: float = 80000.0

    # --- anomaly detection -------------------------------------------------
    anomaly_z_threshold: float = 2.5
    anomaly_min_samples: int = 5

    # --- spoilage prior calibration ---------------------------------------
    # Saturating exposure-response: E50 is the thermal exposure (in °C·min)
    # above the safe maximum at which ~63% of the batch is judged at risk.
    # Prototype parameters, not certified food-safety thresholds.
    spoilage_exposure_e50_cmin: float = 15.0
    spoilage_base_weight: float = 0.4
    spoilage_exposure_weight: float = 0.6

    # --- optimization economics -------------------------------------------
    transport_cost_per_km: float = 4.5
    delay_cost_per_min: float = 2.0
    # Extra fraction of shelf life lost per minute in transit.
    transit_loss_rate_per_min: float = 0.0008
    average_speed_kmh: float = 45.0

    # --- food-loss impact ------------------------------------------------------
    # kg CO2e avoided per kg of food not wasted. Global average for food wastage:
    # 3.3 Gt CO2e over 1.3 Gt of food (FAO 2013, "Food Wastage Footprint").
    # Conservative for meat, whose own footprint per kg is several times higher.
    co2e_kg_per_kg_food: float = 2.5
    # Days of history in GET /api/analytics/food-loss/series overTime.
    food_loss_series_days: int = 14

    # --- Laya: local, non-autoregressive System 1 decision engine ----------
    # Optional. It runs as a separate service (laya-serve) and is never allowed
    # to override the deterministic decision engine; any failure is ignored.
    laya_enabled: bool = True
    laya_url: str = "http://localhost:8100"
    laya_model: str = "router"  # router | english | multilingual | typed-decisions
    laya_timeout_s: float = 20.0
    # Individual System-1 tasks (each fail-safe when Laya is unavailable).
    laya_routing_enabled: bool = True       # local vs frontier model choice
    laya_guardrails_enabled: bool = True    # prompt-injection / scope screening
    laya_moderation_enabled: bool = True    # output safety screening
    laya_triage_enabled: bool = True        # operator-message triage
    # The worker asks Laya (System 1) at most once this often per truck, since on
    # CPU each call costs seconds; on-demand endpoints are always fresh.
    laya_min_interval_s: float = 30.0

    # --- simple grounding (lexical retrieval, no vector database) ---------
    grounding_enabled: bool = True
    grounding_top_k: int = 3


settings = Settings()