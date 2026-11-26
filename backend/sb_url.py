"""Normalise the Supabase connection string (passwords may contain '@' or other reserved characters)."""
import os
from urllib.parse import quote, unquote


def database_url(driver: str = "postgresql") -> str:
    raw = os.environ["SUPABASE_DATABASE_URL"].strip()
    scheme, rest = raw.split("://", 1)
    creds, host = rest.rsplit("@", 1)
    user, password = creds.split(":", 1)
    return f"{driver}://{user}:{quote(unquote(password), safe='')}@{host}"
