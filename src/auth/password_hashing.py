import bcrypt


def get_hashed_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_password.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


# Хеш-заглушка для входа с несуществующим email: проверяем пароль и против неё,
# чтобы по времени ответа нельзя было отличить «нет такого email» от «неверный пароль»
DUMMY_PASSWORD_HASH = get_hashed_password("dummy-password")
