# -*- coding: utf-8 -*-
from .miaokol.client import MiaokolClient

def get_miaokol_client(session_id: str, dry_run: bool = False) -> MiaokolClient:
    """
    Instantiate the core MiaokolClient using the session_id stored in the SQLite database.
    """
    cookie_str = f"PHPSESSID={session_id}"
    return MiaokolClient(cookie=cookie_str, dry_run=dry_run)
