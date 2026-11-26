"""Async connection to the owner's Supabase Postgres (Transaction Pooler)."""
import json
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from sb_url import database_url

engine = create_async_engine(
    database_url("postgresql+asyncpg"),
    pool_size=10,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=False,
    echo=False,
    connect_args={"statement_cache_size": 0, "command_timeout": 30},  # required for the transaction pooler
)


def _row(r) -> dict:
    return dict(r._mapping)


async def fetch(sql: str, **params) -> list[dict]:
    async with engine.connect() as conn:
        res = await conn.execute(text(sql), params)
        return [_row(r) for r in res]


async def fetchrow(sql: str, **params) -> dict | None:
    rows = await fetch(sql, **params)
    return rows[0] if rows else None


async def execute(sql: str, **params) -> list[dict]:
    """Write inside a transaction; returns RETURNING rows (if any)."""
    async with engine.begin() as conn:
        res = await conn.execute(text(sql), params)
        return [_row(r) for r in res] if res.returns_rows else []


def as_json(value, default):
    if value is None:
        return default
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default
