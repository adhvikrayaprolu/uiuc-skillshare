def parse_bool(value, default=None):
    if value is None:
        return default
    if str(value).lower() in {"true", "1", "yes"}:
        return True
    if str(value).lower() in {"false", "0", "no"}:
        return False
    return default
