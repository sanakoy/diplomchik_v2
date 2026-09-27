from datetime import datetime

import pytest

from src.operation.models import Operation
from tests.utils import auth_headers, get_obj


async def get_month_total(
    client, user, year: int, month: int, operation: str = "spending"
) -> float:
    """Сумма за месяц так, как её видит пользователь: считается по операциям."""
    response = await client.get(
        "/api/v1/categories/statistic",
        params={"operation": operation, "year": year, "month": month},
        headers=auth_headers(user),
    )
    return response.json()["total"]


# ---------- GET /operations ----------


async def test_get_operations(client, create_user, create_category, create_operation):
    user = await create_user()
    food = await create_category(user, name="Продукты")
    salary = await create_category(
        user, name="Зарплата", is_profit=True, image_url=None
    )
    old_op = await create_operation(
        food, sum=100, date=datetime(2026, 8, 1, 10, 0), comment="Хлеб"
    )
    new_op = await create_operation(
        salary, sum=50000, date=datetime(2026, 9, 5, 9, 0), comment="Аванс"
    )

    response = await client.get("/api/v1/operations", headers=auth_headers(user))

    assert response.status_code == 200
    # Сначала новые операции
    assert response.json() == {
        "data": [
            {
                "id": new_op.id,
                "sum": 50000.0,
                "comment": "Аванс",
                "date": "2026-09-05T09:00:00",
                "category_id": salary.id,
                "cat_name": "Зарплата",
                "image_url": None,
                "is_profit": True,
            },
            {
                "id": old_op.id,
                "sum": 100.0,
                "comment": "Хлеб",
                "date": "2026-08-01T10:00:00",
                "category_id": food.id,
                "cat_name": "Продукты",
                "image_url": "/static/img/food.png",
                "is_profit": False,
            },
        ]
    }


async def test_get_operations_empty(client, create_user):
    user = await create_user()

    response = await client.get("/api/v1/operations", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == {"data": []}


async def test_get_operations_of_other_user_are_hidden(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    other_user = await create_user()
    own_op = await create_operation(await create_category(user))
    await create_operation(await create_category(other_user))

    response = await client.get("/api/v1/operations", headers=auth_headers(user))

    assert [op["id"] for op in response.json()["data"]] == [own_op.id]


@pytest.fixture
async def operations_for_filters(create_user, create_category, create_operation):
    user = await create_user()
    food = await create_category(user, name="Продукты")
    cafe = await create_category(user, name="Кафе")
    salary = await create_category(user, name="Зарплата", is_profit=True)
    ops = {
        "food_sep": await create_operation(food, date=datetime(2026, 9, 1)),
        "food_sep_end": await create_operation(
            food, date=datetime(2026, 9, 30, 23, 59)
        ),
        "food_oct": await create_operation(food, date=datetime(2026, 10, 1)),
        "food_sep_2025": await create_operation(food, date=datetime(2025, 9, 15)),
        "cafe_sep": await create_operation(cafe, date=datetime(2026, 9, 10)),
        "salary_sep": await create_operation(salary, date=datetime(2026, 9, 5)),
    }
    return user, {"food": food, "cafe": cafe, "salary": salary}, ops


@pytest.mark.parametrize(
    "params, expected",
    [
        (
            {"year": 2026, "month": 9},
            {"food_sep", "food_sep_end", "cafe_sep", "salary_sep"},
        ),
        ({"operation": "profit"}, {"salary_sep"}),
        (
            {"operation": "spending"},
            {"food_sep", "food_sep_end", "food_oct", "food_sep_2025", "cafe_sep"},
        ),
        (
            {"category": "food"},
            {"food_sep", "food_sep_end", "food_oct", "food_sep_2025"},
        ),
        (
            {"year": 2026, "month": 9, "operation": "spending", "category": "food"},
            {"food_sep", "food_sep_end"},
        ),
    ],
)
async def test_get_operations_filters(client, operations_for_filters, params, expected):
    user, categories, ops = operations_for_filters
    params = dict(params)
    if "category" in params:
        params["category_id"] = categories[params.pop("category")].id

    response = await client.get(
        "/api/v1/operations", params=params, headers=auth_headers(user)
    )

    assert response.status_code == 200
    expected_ids = {ops[name].id for name in expected}
    assert {op["id"] for op in response.json()["data"]} == expected_ids


@pytest.mark.parametrize(
    "params",
    [
        {"year": 2026},
        {"month": 9},
        {"year": 2026, "month": 13},
        {"year": 2026, "month": 0},
        {"operation": "abc"},
        {"category_id": "abc"},
    ],
)
async def test_get_operations_invalid_params(client, create_user, params):
    user = await create_user()

    response = await client.get(
        "/api/v1/operations", params=params, headers=auth_headers(user)
    )

    assert response.status_code == 422


# ---------- POST /create ----------


async def test_create_operation(client, create_user, create_category, create_operation):
    user = await create_user()
    category = await create_category(user)
    await create_operation(category, sum=100, date=datetime(2026, 9, 1))

    response = await client.post(
        "/api/v1/operations/create",
        json={
            "sum": 250.5,
            "comment": "Молоко",
            "category_id": category.id,
            "date": "2026-09-17T15:30:00",
        },
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Операция успешно создана"}
    list_response = await client.get(
        "/api/v1/operations",
        params={"year": 2026, "month": 9},
        headers=auth_headers(user),
    )
    created = await get_obj(Operation, list_response.json()["data"][0]["id"])
    assert created.sum == 250.5
    assert created.comment == "Молоко"
    assert created.date == datetime(2026, 9, 17, 15, 30)
    assert created.category_id == category.id
    # Сумма за месяц учитывает новую операцию
    assert await get_month_total(client, user, 2026, 9) == 350.5


@pytest.mark.parametrize(
    "json",
    [
        {"category_id": 1, "date": "2026-09-17T15:30:00"},
        {"sum": 100, "date": "2026-09-17T15:30:00"},
        {"sum": 100, "category_id": 1},
        {"sum": "много", "category_id": 1, "date": "2026-09-17T15:30:00"},
    ],
)
async def test_create_operation_validation(client, create_user, json):
    user = await create_user()

    response = await client.post(
        "/api/v1/operations/create", json=json, headers=auth_headers(user)
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "extra",
    [{"sum": 0}, {"sum": -250}, {"comment": "к" * 101}],
)
async def test_create_operation_invalid_values(
    client, create_user, create_category, extra
):
    user = await create_user()
    category = await create_category(user)
    valid = {"sum": 250, "category_id": category.id, "date": "2026-09-17T15:30:00"}

    response = await client.post(
        "/api/v1/operations/create", json=valid | extra, headers=auth_headers(user)
    )

    assert response.status_code == 422
    assert await get_month_total(client, user, 2026, 9) == 0
    # Контроль: без некорректного поля та же операция создаётся,
    # комментарий ровно в 100 символов допустим
    response = await client.post(
        "/api/v1/operations/create",
        json=valid | {"comment": "к" * 100},
        headers=auth_headers(user),
    )
    assert response.status_code == 200
    assert await get_month_total(client, user, 2026, 9) == 250


async def test_create_operation_in_nonexistent_category(
    client, create_user, create_category
):
    # У пользователя есть своя категория: 404 должен быть именно из-за чужого id
    user = await create_user()
    category = await create_category(user)

    response = await client.post(
        "/api/v1/operations/create",
        json={
            "sum": 100,
            "category_id": category.id + 1,
            "date": "2026-09-17T15:30:00",
        },
        headers=auth_headers(user),
    )

    assert response.status_code == 404
    # Операция не создалась, в том числе в своей категории
    list_response = await client.get("/api/v1/operations", headers=auth_headers(user))
    assert list_response.json() == {"data": []}
    # Контроль: тот же запрос в свою категорию проходит
    own_response = await client.post(
        "/api/v1/operations/create",
        json={"sum": 100, "category_id": category.id, "date": "2026-09-17T15:30:00"},
        headers=auth_headers(user),
    )
    assert own_response.status_code == 200


async def test_create_operation_in_category_of_other_user(
    client, create_user, create_category
):
    user = await create_user()
    other_user = await create_user()
    other_category = await create_category(other_user)

    response = await client.post(
        "/api/v1/operations/create",
        json={
            "sum": 100,
            "category_id": other_category.id,
            "date": "2026-09-17T15:30:00",
        },
        headers=auth_headers(user),
    )

    assert response.status_code == 404
    # У владельца категории операция тоже не появилась
    other_response = await client.get(
        "/api/v1/operations", headers=auth_headers(other_user)
    )
    assert other_response.json() == {"data": []}


# ---------- PATCH /update ----------


async def test_update_operation(client, create_user, create_category, create_operation):
    user = await create_user()
    category = await create_category(user)
    operation = await create_operation(
        category, sum=100, comment="Старый", date=datetime(2026, 9, 1)
    )
    await create_operation(category, sum=50, date=datetime(2026, 9, 2))

    response = await client.patch(
        f"/api/v1/operations/update/{operation.id}",
        json={"sum": 300, "comment": "Новый"},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Операция успешно обновлена"}
    updated = await get_obj(Operation, operation.id)
    assert updated.sum == 300
    assert updated.comment == "Новый"
    # Непереданные поля не затираются
    assert updated.date == operation.date
    # Сумма за месяц пересчитывается по новым значениям
    assert await get_month_total(client, user, 2026, 9) == 350


async def test_update_operation_date(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    operation = await create_operation(await create_category(user))

    response = await client.patch(
        f"/api/v1/operations/update/{operation.id}",
        json={"date": "2025-01-02T03:04:05"},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert (await get_obj(Operation, operation.id)).date == datetime(
        2025, 1, 2, 3, 4, 5
    )


async def test_update_operation_cannot_change_category(
    client, create_user, create_category, create_operation
):
    # Смена категории сменила бы и владельца операции, поэтому category_id запрещён
    user = await create_user()
    old_category = await create_category(user, name="Старая")
    new_category = await create_category(user, name="Новая")
    operation = await create_operation(old_category, sum=100)

    response = await client.patch(
        f"/api/v1/operations/update/{operation.id}",
        json={"category_id": new_category.id},
        headers=auth_headers(user),
    )

    assert response.status_code == 422
    assert (await get_obj(Operation, operation.id)).category_id == old_category.id


@pytest.mark.parametrize(
    "json",
    [
        {"sum": 0},
        {"sum": -100},
        # null записал бы NULL в NOT NULL колонку: раньше это был 500
        {"sum": None},
        {"comment": "к" * 101},
    ],
)
async def test_update_operation_invalid_values(
    client, create_user, create_category, create_operation, json
):
    user = await create_user()
    category = await create_category(user)
    operation = await create_operation(category, sum=100, date=datetime(2026, 9, 1))

    response = await client.patch(
        f"/api/v1/operations/update/{operation.id}",
        json=json,
        headers=auth_headers(user),
    )

    assert response.status_code == 422
    assert await get_month_total(client, user, 2026, 9) == 100
    # Контроль: корректное значение того же поля принимается
    response = await client.patch(
        f"/api/v1/operations/update/{operation.id}",
        json={"sum": 50, "comment": "к" * 100},
        headers=auth_headers(user),
    )
    assert response.status_code == 200
    assert await get_month_total(client, user, 2026, 9) == 50


async def test_update_nonexistent_operation(
    client, create_user, create_category, create_operation
):
    # У пользователя есть своя операция: 404 должен быть именно из-за чужого id
    user = await create_user()
    operation = await create_operation(await create_category(user), sum=100)

    response = await client.patch(
        f"/api/v1/operations/update/{operation.id + 1}",
        json={"sum": 1},
        headers=auth_headers(user),
    )

    assert response.status_code == 404
    assert (await get_obj(Operation, operation.id)).sum == 100
    # Контроль: тот же запрос к своей операции проходит
    own_response = await client.patch(
        f"/api/v1/operations/update/{operation.id}",
        json={"sum": 1},
        headers=auth_headers(user),
    )
    assert own_response.status_code == 200


async def test_update_operation_of_other_user(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    other_operation = await create_operation(
        await create_category(await create_user()), sum=100
    )

    response = await client.patch(
        f"/api/v1/operations/update/{other_operation.id}",
        json={"sum": 1},
        headers=auth_headers(user),
    )

    assert response.status_code == 404
    assert (await get_obj(Operation, other_operation.id)).sum == 100


# ---------- DELETE /delete ----------


async def test_delete_operation(client, create_user, create_category, create_operation):
    user = await create_user()
    category = await create_category(user)
    operation = await create_operation(category, sum=100, date=datetime(2026, 9, 1))
    await create_operation(category, sum=50, date=datetime(2026, 9, 2))

    response = await client.delete(
        f"/api/v1/operations/delete/{operation.id}", headers=auth_headers(user)
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Операция успешно удалена"}
    assert await get_obj(Operation, operation.id) is None
    # Удалённая операция больше не учитывается в сумме за месяц
    assert await get_month_total(client, user, 2026, 9) == 50


async def test_delete_nonexistent_operation(
    client, create_user, create_category, create_operation
):
    # У пользователя есть своя операция: 404 должен быть именно из-за чужого id
    user = await create_user()
    operation = await create_operation(await create_category(user))

    response = await client.delete(
        f"/api/v1/operations/delete/{operation.id + 1}", headers=auth_headers(user)
    )

    assert response.status_code == 404
    assert await get_obj(Operation, operation.id) is not None
    # Контроль: тот же запрос к своей операции проходит
    own_response = await client.delete(
        f"/api/v1/operations/delete/{operation.id}", headers=auth_headers(user)
    )
    assert own_response.status_code == 200


async def test_delete_operation_of_other_user(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    other_operation = await create_operation(await create_category(await create_user()))

    response = await client.delete(
        f"/api/v1/operations/delete/{other_operation.id}", headers=auth_headers(user)
    )

    assert response.status_code == 404
    assert await get_obj(Operation, other_operation.id) is not None


# ---------- GET /totals ----------


async def get_period_totals(client, user, date_from: str, date_to: str):
    response = await client.get(
        "/api/v1/operations/totals",
        params={"date_from": date_from, "date_to": date_to},
        headers=auth_headers(user),
    )
    assert response.status_code == 200
    return response.json()


def category_total(category, total):
    return {
        "category_id": category.id,
        "name": category.name,
        "is_profit": category.is_profit,
        "sum": total,
    }


async def test_period_totals(client, create_user, create_category, create_operation):
    user = await create_user()
    food = await create_category(user, name="Продукты")
    cafe = await create_category(user, name="Кафе")
    salary = await create_category(user, name="Зарплата", is_profit=True)
    await create_operation(food, sum=100.5, date=datetime(2026, 9, 3, 10))
    await create_operation(food, sum=50, date=datetime(2026, 9, 3, 18))
    await create_operation(cafe, sum=200, date=datetime(2026, 9, 3))
    await create_operation(cafe, sum=300, date=datetime(2026, 9, 20))
    await create_operation(salary, sum=5000, date=datetime(2026, 9, 5))

    data = await get_period_totals(client, user, "2026-09-01", "2026-09-30")

    assert data["income"] == 5000
    assert data["expense"] == 650.5
    # Категории — от большей суммы к меньшей
    assert data["categories"] == [
        category_total(salary, 5000),
        category_total(cafe, 500),
        category_total(food, 150.5),
    ]
    # По дням: операции одной категории за день сложены, дни по порядку
    assert data["days"] == [
        {"day": "2026-09-03", "category_id": food.id, "sum": 150.5},
        {"day": "2026-09-03", "category_id": cafe.id, "sum": 200},
        {"day": "2026-09-05", "category_id": salary.id, "sum": 5000},
        {"day": "2026-09-20", "category_id": cafe.id, "sum": 300},
    ]


async def test_period_totals_boundaries(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    food = await create_category(user)
    await create_operation(food, sum=1, date=datetime(2026, 9, 9, 23, 59, 59))
    await create_operation(food, sum=10, date=datetime(2026, 9, 10, 0, 0))
    await create_operation(food, sum=100, date=datetime(2026, 9, 15, 23, 59, 59))
    await create_operation(food, sum=1000, date=datetime(2026, 9, 16, 0, 0))

    data = await get_period_totals(client, user, "2026-09-10", "2026-09-15")

    # Оба крайних дня входят целиком, соседние — нет
    assert data["expense"] == 110
    assert [row["day"] for row in data["days"]] == ["2026-09-10", "2026-09-15"]


async def test_period_totals_sums_in_decimal(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    food = await create_category(user, name="Продукты")
    cafe = await create_category(user, name="Кафе")
    taxi = await create_category(user, name="Такси")
    await create_operation(food, sum=0.1, date=datetime(2026, 9, 2))
    await create_operation(cafe, sum=0.2, date=datetime(2026, 9, 3))
    await create_operation(taxi, sum=0.3, date=datetime(2026, 9, 4))

    data = await get_period_totals(client, user, "2026-09-01", "2026-09-30")

    # Во float 0.1 + 0.2 + 0.3 = 0.6000000000000001: итог копится в Decimal
    assert data["expense"] == 0.6


async def test_period_totals_of_other_user_are_hidden(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    other_user = await create_user()
    own = await create_category(user)
    other = await create_category(other_user)
    await create_operation(own, sum=100, date=datetime(2026, 9, 1))
    await create_operation(other, sum=7000, date=datetime(2026, 9, 1))

    data = await get_period_totals(client, user, "2026-09-01", "2026-09-30")

    assert data["expense"] == 100
    assert data["categories"] == [category_total(own, 100)]
    assert [row["category_id"] for row in data["days"]] == [own.id]


async def test_period_totals_empty(client, create_user):
    user = await create_user()

    data = await get_period_totals(client, user, "2026-09-01", "2026-09-30")

    assert data == {"income": 0, "expense": 0, "categories": [], "days": []}


@pytest.mark.parametrize(
    "params",
    [
        {"date_from": "2026-09-01"},
        {"date_to": "2026-09-30"},
        {"date_from": "2026-09-30", "date_to": "2026-09-01"},
        # 367 дней: на день длиннее допустимого
        {"date_from": "2025-01-01", "date_to": "2026-01-02"},
        {"date_from": "2026-09-31", "date_to": "2026-10-01"},
    ],
)
async def test_period_totals_invalid_params(client, create_user, params):
    user = await create_user()

    response = await client.get(
        "/api/v1/operations/totals", params=params, headers=auth_headers(user)
    )
    assert response.status_code == 422

    # Контроль: крайний допустимый период — ровно 366 дней — проходит,
    # как и период из одного дня
    for date_from, date_to in [
        ("2025-01-01", "2026-01-01"),
        ("2026-09-05", "2026-09-05"),
    ]:
        response = await client.get(
            "/api/v1/operations/totals",
            params={"date_from": date_from, "date_to": date_to},
            headers=auth_headers(user),
        )
        assert response.status_code == 200


async def test_period_totals_requires_auth(client, create_user):
    user = await create_user()
    params = {"date_from": "2026-09-01", "date_to": "2026-09-30"}

    response = await client.get("/api/v1/operations/totals", params=params)

    assert response.status_code == 401
    # Контроль: тот же запрос с токеном проходит
    response = await client.get(
        "/api/v1/operations/totals", params=params, headers=auth_headers(user)
    )
    assert response.status_code == 200
