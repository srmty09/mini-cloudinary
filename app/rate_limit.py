import time
from collections import defaultdict
from fastapi import Depends, HTTPException, Request, status
from app.auth import get_current_user

WINDOW_SECONDS = 60
MAX_ATTEMPTS = 5

_buckets = defaultdict(lambda: (0.0, 0))


def _check(scope, identity, max_attempts, window_seconds):
    key = (scope, identity)
    now = time.monotonic()
    window_start, count = _buckets[key]

    if now - window_start > window_seconds:
        window_start, count = now, 0

    count += 1
    _buckets[key] = (window_start, count)

    if count > max_attempts:
        retry_after = max(1, int(window_seconds - (now - window_start)))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests, try again later",
            headers={"Retry-After": str(retry_after)},
        )


def rate_limit(scope, max_attempts=MAX_ATTEMPTS, window_seconds=WINDOW_SECONDS):
    def dependency(request: Request):
        ip = request.client.host if request.client else "unknown"
        _check(scope, ip, max_attempts, window_seconds)

    return dependency


def rate_limit_per_user(scope, max_attempts=MAX_ATTEMPTS, window_seconds=WINDOW_SECONDS):
    def dependency(user=Depends(get_current_user)):
        _check(scope, str(user.id), max_attempts, window_seconds)

    return dependency
