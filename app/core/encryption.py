import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings


def _get_fernet_key() -> bytes:
    """
    Generates a valid 32-byte URL-safe base64 key for Fernet.
    Uses settings.ENCRYPTION_KEY if present, otherwise derives from settings.SECRET_KEY.
    """
    raw_key = settings.ENCRYPTION_KEY or settings.SECRET_KEY
    # Hash raw key to 32 bytes using SHA-256 and url-safe base64 encode
    hashed_key = hashlib.sha256(raw_key.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(hashed_key)


def encrypt_string(plain_text: str) -> str:
    """Encrypts a plain text string into a cipher string."""
    if not plain_text:
        return ""
    fernet = Fernet(_get_fernet_key())
    encrypted_bytes = fernet.encrypt(plain_text.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_string(cipher_text: str) -> str:
    """Decrypts a cipher string back into plain text."""
    if not cipher_text:
        return ""
    try:
        fernet = Fernet(_get_fernet_key())
        decrypted_bytes = fernet.decrypt(cipher_text.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except Exception:
        return ""
