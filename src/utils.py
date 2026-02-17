from uuid import UUID
from sqlalchemy import select


async def get_obj_by_id(
    id: UUID,
    session,
    model,
):
    obj = (
        await session.execute(select(model).where(model.id == id))
    ).scalar_one_or_none()
    return obj


async def get_objs(session, model, query_params=None) -> list:
    query = get_objs_query(model, query_params)
    objs = (await session.execute(query)).scalars().all()
    return objs


def get_objs_query(model, query_params=None):
    query = select(model)
    query = add_filters(query, query_params)
    return query


def add_filters(query, query_params):
    if hasattr(query_params, "order_by"):
        query = query_params.sort(query)
    if hasattr(query_params, "filter"):
        query = query_params.filter(query)

    return query
