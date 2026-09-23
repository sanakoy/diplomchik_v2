import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException
from redis.asyncio import Redis
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.jwt_utils import create_access_token
from src.auth.models import RefreshToken, User
from src.auth.password_hashing import (
    DUMMY_PASSWORD_HASH,
    get_hashed_password,
    verify_password,
)
from src.auth.rate_limit import LoginRateLimiter
from src.auth.refresh_tokens import generate_refresh_token, hash_refresh_token
from src.auth.schemas import IssuedTokens, LoginRequest, RegisterRequest
from src.database import get_session
from src.redis_client import get_redis
from src.settings import settings


def invalid_refresh_token() -> HTTPException:
    return HTTPException(status_code=401, detail="Недействительный refresh-токен")


class AuthService:
    """Регистрация, вход, ротация refresh-токенов и выход.

    В отличие от BaseService, методы сами управляют транзакцией: ротация
    (отзыв старого токена и выдача нового) должна пройти целиком или не пройти вовсе.
    """

    def __init__(self, session: AsyncSession, rate_limiter: LoginRateLimiter):
        self.session = session
        self.rate_limiter = rate_limiter

    async def register(self, data: RegisterRequest) -> User:
        user = User(
            email=data.email, hashed_password=get_hashed_password(data.password)
        )
        self.session.add(user)
        try:
            await self.session.commit()
        except IntegrityError as err:
            # Уникальный индекс по email: сработает и при гонке двух одновременных регистраций
            await self.session.rollback()
            raise HTTPException(
                status_code=409, detail="Пользователь с таким email уже существует"
            ) from err
        await self.session.refresh(user)
        return user

    async def login(self, data: LoginRequest, client_ip: str) -> IssuedTokens:
        await self.rate_limiter.hit(ip=client_ip, email=data.email)

        user = (
            await self.session.execute(select(User).where(User.email == data.email))
        ).scalar_one_or_none()

        # Пароль проверяем всегда, даже без пользователя, чтобы время ответа
        # не выдавало, зарегистрирован ли email
        hashed_password = user.hashed_password if user else DUMMY_PASSWORD_HASH
        password_ok = verify_password(data.password, hashed_password)
        if user is None or not password_ok:
            # Одинаковый ответ для обоих случаев по той же причине
            raise HTTPException(status_code=401, detail="Неверный email или пароль")

        # Заодно убираем протухшие токены пользователя, чтобы таблица не росла вечно
        await self.session.execute(
            delete(RefreshToken).where(
                RefreshToken.user_id == user.id,
                RefreshToken.expires_at < datetime.now(UTC),
            )
        )
        tokens = self._issue_tokens(user_id=user.id, family_id=uuid.uuid4())
        await self.session.commit()
        await self.rate_limiter.forget_successful(ip=client_ip, email=data.email)
        return tokens

    async def refresh(self, refresh_token: str | None) -> IssuedTokens:
        if not refresh_token:
            raise invalid_refresh_token()

        # FOR UPDATE: два одновременных запроса с одним токеном не смогут оба
        # увидеть его неотозванным и оба получить новую пару
        record = (
            await self.session.execute(
                select(RefreshToken)
                .where(RefreshToken.token_hash == hash_refresh_token(refresh_token))
                .with_for_update()
            )
        ).scalar_one_or_none()
        if record is None:
            raise invalid_refresh_token()

        now = datetime.now(UTC)
        if record.revoked_at is not None:
            # Отозванным токеном честный клиент не пользуется: его украли.
            # Гасим всю цепочку этого входа, включая токен, выданный злоумышленнику
            await self._revoke_family(record.family_id, now)
            await self.session.commit()
            raise invalid_refresh_token()
        if record.expires_at <= now:
            raise invalid_refresh_token()

        record.revoked_at = now
        tokens = self._issue_tokens(user_id=record.user_id, family_id=record.family_id)
        await self.session.commit()
        return tokens

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        await self.session.execute(
            update(RefreshToken)
            .where(
                RefreshToken.token_hash == hash_refresh_token(refresh_token),
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(UTC))
        )
        await self.session.commit()

    async def get_user(self, user_id: int) -> User | None:
        return await self.session.get(User, user_id)

    def _issue_tokens(self, user_id: int, family_id: uuid.UUID) -> IssuedTokens:
        """Access-токен и новый refresh-токен. Запись о refresh добавляется в сессию,
        commit делает вызывающий метод."""
        refresh_token = generate_refresh_token()
        self.session.add(
            RefreshToken(
                user_id=user_id,
                token_hash=hash_refresh_token(refresh_token),
                family_id=family_id,
                expires_at=datetime.now(UTC)
                + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            )
        )
        return IssuedTokens(
            access_token=create_access_token(user_id),
            refresh_token=refresh_token,
        )

    async def _revoke_family(self, family_id: uuid.UUID, now: datetime) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(
                RefreshToken.family_id == family_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )


async def get_auth_service(
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> AuthService:
    return AuthService(session=session, rate_limiter=LoginRateLimiter(redis))
