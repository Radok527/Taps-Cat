from datetime import datetime, timezone, timedelta


def seconds_until_midnight_utc() -> int:
    now = datetime.now(tz=timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(1, int((tomorrow - now).total_seconds()))
