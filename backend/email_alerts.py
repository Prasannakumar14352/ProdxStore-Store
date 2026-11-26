"""Emergent managed email (Resend proxy) — contact-form alerts to the store's own support inbox."""
import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Emergent managed email proxy. This is a CONSTANT — never read it from os.environ.
EMAIL_BASE_URL = "https://integrations.emergentagent.com"

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> str | None:
    """Internal only: recipient and template are server-side. Never raises — logs failures."""
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": os.environ["EMAIL_FROM_NAME"]}
    reply_to = os.environ.get("EMAIL_REPLY_TO")
    if reply_to:
        payload["contact_email"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                     headers={"X-Email-Key": os.environ["EMERGENT_EMAIL_KEY"]}, json=payload)
        resp.raise_for_status()
        email_id = resp.json().get("id")
        logger.info("Alert email sent: %s", email_id)
        return email_id
    except httpx.HTTPStatusError as e:
        try:
            info = e.response.json()
        except ValueError:
            info = {}
        if info.get("code") in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            logger.warning("Email paused: %s (%s): %s", info.get("code"), e.response.status_code, info.get("message", ""))
        else:
            logger.error("Email send failed: %s %s", e.response.status_code, e.response.text)
    except Exception as e:  # alert must never break the contact form
        logger.error("Email send error: %s", e)
    return None


def contact_alert_html(msg: dict) -> str:
    name, email = escape(msg["name"]), escape(msg["email"])
    topic, body = escape(msg["topic"]), escape(msg["message"]).replace("\n", "<br>")
    brand = escape(os.environ["EMAIL_FROM_NAME"])
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ef">'
        '<tr><td style="padding:24px;font-family:Arial,sans-serif;color:#1d1a17">'
        f'<h2 style="margin:0 0 12px;color:#e86f00">New support message</h2>'
        f'<p style="margin:0 0 4px"><strong>From:</strong> {name} '
        f'(<a href="mailto:{email}" style="color:#e86f00">{email}</a>)</p>'
        f'<p style="margin:0 0 4px"><strong>Topic:</strong> {topic}</p>'
        f'<p style="margin:0 0 16px"><strong>Reference:</strong> PX-{escape(msg["id"][:6].upper())}</p>'
        f'<div style="padding:16px;background:#ffffff;border-radius:8px;line-height:1.5">{body}</div>'
        '<p style="margin:16px 0 0">Reply to the customer from your inbox, or open the Messages tab in the admin area.</p>'
        f'<p style="font-size:12px;color:#888;margin-top:24px">Sent by {brand} contact form.</p>'
        '</td></tr></table>'
    )


def review_alert_html(t: dict) -> str:
    stars = "★" * t["rating"] + "☆" * (5 - t["rating"])
    brand = escape(os.environ["EMAIL_FROM_NAME"])
    role = f' · {escape(t["role"])}' if t.get("role") else ""
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ef">'
        '<tr><td style="padding:24px;font-family:Arial,sans-serif;color:#1d1a17">'
        '<h2 style="margin:0 0 12px;color:#e86f00">New review waiting for your check</h2>'
        f'<p style="margin:0 0 4px"><strong>Product:</strong> {escape(t["product"])}</p>'
        f'<p style="margin:0 0 4px"><strong>Rating:</strong> <span style="color:#e86f00;font-size:18px">{stars}</span> ({t["rating"]}/5)</p>'
        f'<p style="margin:0 0 16px"><strong>From:</strong> {escape(t["name"])}{role} '
        f'(<a href="mailto:{escape(t["email"])}" style="color:#e86f00">{escape(t["email"])}</a>)</p>'
        f'<div style="padding:16px;background:#ffffff;border-radius:8px;line-height:1.5">{escape(t["quote"]).replace(chr(10), "<br>")}</div>'
        '<p style="margin:16px 0 0">It stays hidden until you confirm this is a real customer: open the Testimonials tab in the admin area and switch on Verified.</p>'
        f'<p style="font-size:12px;color:#888;margin-top:24px">Sent by {brand} review form.</p>'
        '</td></tr></table>'
    )
