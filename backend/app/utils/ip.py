import hashlib
from fastapi import Request


def get_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()
