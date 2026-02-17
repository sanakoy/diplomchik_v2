from src.utils import get_obj_by_id, get_objs
from sqlalchemy.ext.asyncio import AsyncSession


class BaseService:
    model = None
    session: AsyncSession = None

    def __init__(self, session):
        self.session = session

    async def get_obj_by_id(self, id):
        obj = await get_obj_by_id(id=id, session=self.session, model=self.model)
        return obj

    async def create_obj(self, data: dict):
        new_obj = self.model(**data)
        self.session.add(new_obj)

        await self.session.commit()
        await self.session.refresh(new_obj)
        return new_obj

    async def get_objs(self, query_params=None) -> list:
        objs = await get_objs(self.session, self.model, query_params)
        return objs
