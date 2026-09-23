from fastapi import HTTPException
from redis.asyncio import Redis

from src.settings import settings


class LoginRateLimiter:
    """Ограничение попыток входа: по email и по IP, счётчики в Redis.

    Считаются неудачные попытки: счётчик увеличивается до проверки пароля, а после
    успешного входа email-счётчик удаляется, из IP-счётчика вычитается эта попытка.
    Проверка до bcrypt: во время блокировки не тратится процессор и нельзя узнать,
    был ли пароль верным.

    Алгоритм — фиксированное окно: при первой попытке ключ получает TTL на длину окна,
    по истечении TTL ключ исчезает сам.
    """

    def __init__(self, redis: Redis):
        self.redis = redis

    async def hit(self, ip: str, email: str) -> None:
        """Учитывает попытку входа. Бросает 429, если лимит по IP или email исчерпан."""
        await self._hit(
            key=self._ip_key(ip),
            limit=settings.LOGIN_MAX_ATTEMPTS_PER_IP,
            window=settings.LOGIN_IP_WINDOW_SECONDS,
        )
        # Для несуществующего email счётчик работает так же: иначе по ответам
        # можно было бы понять, какие email зарегистрированы
        await self._hit(
            key=self._email_key(email),
            limit=settings.LOGIN_MAX_ATTEMPTS_PER_EMAIL,
            window=settings.LOGIN_EMAIL_WINDOW_SECONDS,
        )

    async def forget_successful(self, ip: str, email: str) -> None:
        """Убирает след успешного входа: он не должен приближать пользователя к блокировке.

        Для email счётчик удаляется целиком — прошлые ошибки прощаются после успеха.
        Для IP вычитается только эта попытка: обнулять счётчик нельзя, иначе достаточно
        входить в собственный аккаунт после каждых N попыток, чтобы перебирать чужие бесконечно.
        """
        await self.redis.delete(self._email_key(email))

        ip_key = self._ip_key(ip)
        attempts = await self.redis.decr(ip_key)
        if attempts <= 0:
            # Ключ мог истечь между попыткой и успехом: DECR создал бы его заново,
            # причём без TTL, то есть навсегда
            await self.redis.delete(ip_key)

    async def _hit(self, key: str, limit: int, window: int) -> None:
        # INCR атомарный: два одновременных запроса получат разные номера попыток
        # и не проскочат лимит вдвоём. EXPIRE NX ставит TTL только на новый ключ,
        # поэтому окно отсчитывается от первой попытки и не продлевается
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.incr(key)
            pipe.expire(key, window, nx=True)
            attempts, _ = await pipe.execute()

        if attempts > limit:
            retry_after = await self.redis.ttl(key)
            raise HTTPException(
                status_code=429,
                detail="Слишком много попыток входа, попробуйте позже",
                headers={"Retry-After": str(max(retry_after, 1))},
            )

    @staticmethod
    def _email_key(email: str) -> str:
        return f"login:email:{email}"

    @staticmethod
    def _ip_key(ip: str) -> str:
        return f"login:ip:{ip}"
