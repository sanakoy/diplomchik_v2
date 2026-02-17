from uuid import UUID
from src.schemas import BaseSchema


class Token(BaseSchema):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "Bearer"

class UserToken(BaseSchema):
    id: UUID
