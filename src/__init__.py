# Импорт всех моделей регистрирует их в Base.metadata: без этого Alembic autogenerate
# и test_models_match_migrations не увидят таблицы
from src.auth.models import RefreshToken, User
from src.category.models import Category
from src.operation.models import Operation

__all__ = ["Category", "Operation", "RefreshToken", "User"]
