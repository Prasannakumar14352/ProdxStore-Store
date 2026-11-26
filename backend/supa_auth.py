"""Admin sign-in via Supabase Auth (Google). Admins are profiles with role admin / super_admin."""
import os
import time
import httpx
from fastapi import HTTPException, Request
from pydantic import BaseModel

from db import fetchrow

ADMIN_ROLES = ("admin", "super_admin")
_cache: dict[str, tuple[float, dict]] = {}


class User(BaseModel):
    user_id: str
    email: str
    name: str = ""
    picture: str = ""
    is_admin: bool = False
    role: str = ""


def bearer(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    return auth[7:]


async def _supabase_user(token: str) -> dict:
    hit = _cache.get(token)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            f"{os.environ['SUPABASE_URL'].rstrip('/')}/auth/v1/user",
            headers={"apikey": os.environ["SUPABASE_ANON_KEY"], "Authorization": f"Bearer {token}"},
        )
    if r.status_code != 200:
        raise HTTPException(401, "Session expired — please sign in again")
    data = r.json()
    _cache[token] = (time.monotonic() + 60, data)
    if len(_cache) > 500:
        _cache.clear()
    return data


async def current_user(request: Request) -> User:
    data = await _supabase_user(bearer(request))
    meta = data.get("user_metadata") or {}
    profile = await fetchrow("select role from profiles where id = cast(:id as uuid)", id=data["id"])
    role = (profile or {}).get("role") or ""
    return User(
        user_id=data["id"], email=data.get("email") or "", role=role,
        name=meta.get("full_name") or meta.get("name") or "", picture=meta.get("avatar_url") or "",
        is_admin=role in ADMIN_ROLES,
    )


async def require_admin(request: Request) -> User:
    user = await current_user(request)
    if not user.is_admin:
        raise HTTPException(403, "This Google account is not a ProdXStore admin")
    return user
