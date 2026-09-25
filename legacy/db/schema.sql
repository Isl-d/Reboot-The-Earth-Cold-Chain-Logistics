-- Reference DDL for the cold-chain data platform (PostgreSQL 16 / TimescaleDB).
--
-- The backend creates these tables itself from the SQLAlchemy models on
-- startup (backend/db.py), so this file is documentation and a starting point
-- for inspection or a manual database. It mirrors backend/models.py.
--
-- TimescaleDB (optional): sensor_readings becomes a hypertable partitioned on
-- ts. Its primary key (device_id, ts) includes ts, which a hypertable requires.
-- If the extension is absent the table is a plain, indexed table.

CREATE TABLE IF NOT EXISTS products (
    id                        TEXT PRIMARY KEY,
    name                      TEXT NOT NULL,
    safe_min_temp_c           REAL NOT NULL,
    safe_max_temp_c           REAL NOT NULL,
    ideal_temp_c              REAL NOT NULL,
    initial_shelf_life_hours  REAL NOT NULL,
    value_per_kg              REAL NOT NULL,
    activation_energy_j_mol   REAL NOT NULL DEFAULT 80000.0,
    humidity_limit_pct        REAL NOT NULL DEFAULT 90.0
);

CREATE TABLE IF NOT EXISTS warehouses (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    latitude               DOUBLE PRECISION NOT NULL,
    longitude              DOUBLE PRECISION NOT NULL,
    capacity_kg            REAL NOT NULL,
    available_capacity_kg  REAL NOT NULL,
    min_temp_c             REAL NOT NULL,
    max_temp_c             REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS stores (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    capacity_kg  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS routes (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    origin        TEXT,
    destination   TEXT,
    waypoints     JSONB,
    distance_km   REAL NOT NULL,
    duration_min  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS product_batches (
    id                        TEXT PRIMARY KEY,
    product_id                TEXT REFERENCES products(id),
    quantity_kg               REAL NOT NULL,
    production_date           DATE,
    expiry_date               DATE,
    safe_min_temp_c           REAL NOT NULL,
    safe_max_temp_c           REAL NOT NULL,
    initial_shelf_life_hours  REAL NOT NULL,
    warehouse_id              TEXT REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS trucks (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    device_id         TEXT NOT NULL UNIQUE,
    status            TEXT NOT NULL DEFAULT 'active',
    route_id          TEXT REFERENCES routes(id),
    current_batch_id  TEXT REFERENCES product_batches(id),
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
    id            TEXT PRIMARY KEY,
    truck_id      TEXT REFERENCES trucks(id) NOT NULL,
    kind          TEXT NOT NULL DEFAULT 'dht_gps',
    status        TEXT NOT NULL DEFAULT 'online',
    last_seen_at  TIMESTAMPTZ
);

-- TimescaleDB hypertable candidate: PK includes the time column.
CREATE TABLE IF NOT EXISTS sensor_readings (
    device_id         TEXT NOT NULL,
    truck_id          TEXT NOT NULL,
    ts                TIMESTAMPTZ NOT NULL,
    temperature_c     REAL,
    humidity_pct      REAL,
    latitude          DOUBLE PRECISION,
    longitude         DOUBLE PRECISION,
    speed_kmh         REAL,
    g_force           REAL,
    door_open         BOOLEAN DEFAULT FALSE,
    refrigeration_on  BOOLEAN DEFAULT TRUE,
    valid             BOOLEAN DEFAULT TRUE,
    src               TEXT DEFAULT 'sim',
    created_at        TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (device_id, ts)
);
CREATE INDEX IF NOT EXISTS ix_sensor_readings_truck_ts ON sensor_readings (truck_id, ts);

-- Optional: SELECT create_hypertable('sensor_readings', 'ts',
--   if_not_exists => TRUE, migrate_data => TRUE);

CREATE TABLE IF NOT EXISTS inventory (
    id             TEXT PRIMARY KEY,
    batch_id       TEXT REFERENCES product_batches(id) NOT NULL,
    location_type  TEXT NOT NULL,
    location_id    TEXT NOT NULL,
    quantity_kg    REAL NOT NULL,
    expiry_date    DATE,
    status         TEXT NOT NULL DEFAULT 'in_stock',
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
    id          TEXT PRIMARY KEY,
    truck_id    TEXT NOT NULL,
    batch_id    TEXT,
    type        TEXT NOT NULL,
    severity    TEXT NOT NULL,
    message     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'OPEN',
    risk_score  REAL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simulation_runs (
    id                TEXT PRIMARY KEY,
    truck_id          TEXT,
    scenario          TEXT NOT NULL,
    speed_multiplier  REAL DEFAULT 1.0,
    status            TEXT NOT NULL DEFAULT 'running',
    started_at        TIMESTAMPTZ DEFAULT now(),
    stopped_at        TIMESTAMPTZ
);

-- Data quality: rejected readings, so nothing is silently dropped.
CREATE TABLE IF NOT EXISTS ingest_rejects (
    id          BIGSERIAL PRIMARY KEY,
    ts          TIMESTAMPTZ,
    device_id   TEXT,
    truck_id    TEXT,
    reason      TEXT NOT NULL,
    payload     JSONB,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Person 4 hand-off: predictions override the Person 3 baseline risk.
CREATE TABLE IF NOT EXISTS predictions (
    id                        TEXT PRIMARY KEY,
    truck_id                  TEXT NOT NULL,
    batch_id                  TEXT,
    thermal_exposure          REAL,
    remaining_shelf_life_hours REAL,
    spoilage_probability      REAL,
    confidence                REAL,
    risk_score                REAL,
    risk_level                TEXT,
    recommendation            JSONB,
    result                    JSONB,
    model_version             TEXT DEFAULT 'person4',
    created_at                TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_predictions_truck_created ON predictions (truck_id, created_at);