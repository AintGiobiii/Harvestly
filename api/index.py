# Vercel entrypoint. Vercel's Python runtime looks for a WSGI-compatible
# `app` object inside files under /api — this just re-exports the real Flask
# app that lives in app.py at the repo root, so all the actual routes,
# models, and logic stay in one place (app.py) instead of being duplicated.
from app import app  # noqa: F401
