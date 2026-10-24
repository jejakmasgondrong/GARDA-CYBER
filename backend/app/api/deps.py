"""Dependency bersama untuk endpoint API."""
from app.db.session import get_db  # re-export agar import di router rapi

__all__ = ["get_db"]
