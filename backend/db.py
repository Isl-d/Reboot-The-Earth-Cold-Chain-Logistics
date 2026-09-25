"""Database engine, session factory, and startup schema creation.

PostgreSQL 16 is the baseline. If the TimescaleDB extension is available it is
enabled and ``sensor_readings`` becomes a hypertable partitioned on ``ts``;
otherwise the table stays a plain, timestamp-indexed table, which is enough
for a 48-hour demo. No behaviour depends on which one is in use.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

log = logging.getLogger("coldchain.db")


class Base(DeclarativeBase):
    pass


_is_sqlite = settings.database_url.startswith("sqlite")

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
    # SQLite (tests, scripts/dev_no_broker.py) forbids sharing a connection
    # across threads by default; the API and the ingest thread both use it.
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_foreign_keys(dbapi_connection, _record):  # pragma: no cover
        """SQLite ignores foreign keys unless asked; PostgreSQL never does.

        Enabling this makes the suite catch referential bugs that would
        otherwise pass locally and fail only against PostgreSQL.
        """
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


@contextmanager
def session_scope():
    """A transaction, committed on success and rolled back on error."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _enable_timescale() -> None:
    if not settings.timescale_enabled:
        return
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb"))
            conn.execute(
                text(
                    "SELECT create_hypertable('sensor_readings', 'ts', "
                    "if_not_exists => TRUE, migrate_data => TRUE)"
                )
            )
        log.info("TimescaleDB enabled: sensor_readings is a hypertable")
    except Exception as exc:  # extension missing, or not permitted
        log.warning("TimescaleDB unavailable (%s); using a plain indexed table", exc)


def init_db() -> None:
    """Create every table (idempotent) and enable TimescaleDB if present."""
    from . import models  # noqa: F401  (register mappers)

    Base.metadata.create_all(engine)
    _enable_timescale()


def health() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False