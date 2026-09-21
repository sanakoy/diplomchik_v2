import hashlib
import secrets


def generate_refresh_token() -> str:
    # Refresh — не JWT, а случайная строка: его всё равно проверяет БД,
    # подпись и payload ничего не добавляют
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    # Соль не нужна: у токена 256 бит энтропии, перебор и радужные таблицы бессмысленны.
    # А быстрый sha256 позволяет искать запись по хешу через индекс
    return hashlib.sha256(token.encode()).hexdigest()
