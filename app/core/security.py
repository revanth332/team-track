import hashlib
import hmac
import secrets
from typing import Optional


PASSWORD_HASH_ALGORITHM = "pbkdf2_sha256"
PASSWORD_HASH_ITERATIONS = 260000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_HASH_ITERATIONS,
    ).hex()
    return f"{PASSWORD_HASH_ALGORITHM}${PASSWORD_HASH_ITERATIONS}${salt}${password_hash}"


def verify_password(password: str, stored_password_hash: Optional[str]) -> bool:
    if not stored_password_hash:
        return False

    try:
        algorithm, iterations, salt, expected_hash = stored_password_hash.split("$", 3)
        if algorithm != PASSWORD_HASH_ALGORITHM:
            return False

        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations),
        ).hex()
        return hmac.compare_digest(actual_hash, expected_hash)
    except (TypeError, ValueError):
        return False
