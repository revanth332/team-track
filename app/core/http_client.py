import httpx
from app.core.config import settings

_client: httpx.AsyncClient | None = None

def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        # We can pass timeout settings, pool limits, etc.
        verify_val = settings.SSL_VERIFY
        if isinstance(verify_val, str):
            if verify_val.lower() == "false":
                verify_val = False
            elif verify_val.lower() == "true":
                verify_val = True
                
        _client = httpx.AsyncClient(
            verify=verify_val,
            timeout=httpx.Timeout(30.0, connect=10.0)
        )
    return _client

async def close_http_client():
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
