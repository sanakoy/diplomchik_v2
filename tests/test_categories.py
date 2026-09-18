import pytest

from src.category.models import Category
from src.operation.models import Operation
from tests.utils import auth_headers, current_month_date, get_obj, previous_month_date


def day_key(date) -> str:
    # Тот же формат ключа, что в CategoryService.get_statistic
    return f"{date.day} {date.strftime('%B')}"


# ---------- GET /spending и /profit ----------


async def test_get_spending_categories(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    food = await create_category(user, name="Продукты")
    await create_category(user, name="Транспорт", image_url=None)
    await create_operation(food, sum=100, date=current_month_date(day=1))
    await create_operation(food, sum=50.5, date=current_month_date(day=2))

    response = await client.get(
        "/api/v1/categories/spending", headers=auth_headers(user)
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["operation"] == "spending"
    assert data["total"] == 150.5
    assert data["cats_sum"] == {"Продукты": 150.5, "Транспорт": 0.0}
    cats = {cat["name"]: cat for cat in data["cats"]}
    assert cats["Продукты"] == {
        "id": food.id,
        "name": "Продукты",
        "cat_sum": 150.5,
        "is_profit": False,
        "image_url": "/static/img/food.png",
        "user_id": user.id,
    }
    assert cats["Транспорт"]["cat_sum"] == 0.0
    assert cats["Транспорт"]["image_url"] is None


async def test_get_profit_categories(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    salary = await create_category(user, name="Зарплата", is_profit=True)
    await create_category(user, name="Продукты", is_profit=False)
    await create_operation(salary, sum=50000)

    response = await client.get("/api/v1/categories/profit", headers=auth_headers(user))

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["operation"] == "profit"
    assert [cat["name"] for cat in data["cats"]] == ["Зарплата"]
    assert data["cats"][0]["is_profit"] is True
    assert data["total"] == 50000


async def test_categories_sum_only_current_month(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    food = await create_category(user)
    await create_operation(food, sum=100, date=current_month_date())
    await create_operation(food, sum=1000, date=previous_month_date())

    response = await client.get(
        "/api/v1/categories/spending", headers=auth_headers(user)
    )

    data = response.json()["data"]
    assert data["cats"][0]["cat_sum"] == 100
    assert data["total"] == 100


async def test_categories_of_other_user_are_hidden(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    other_user = await create_user()
    other_category = await create_category(other_user)
    await create_operation(other_category, sum=100)

    response = await client.get(
        "/api/v1/categories/spending", headers=auth_headers(user)
    )

    assert response.status_code == 200
    assert response.json()["data"] == {
        "cats": [],
        "total": 0.0,
        "operation": "spending",
        "cats_sum": {},
    }


# ---------- GET /statistic ----------


async def test_get_statistic(client, create_user, create_category, create_operation):
    user = await create_user()
    food = await create_category(user, name="Продукты")
    cafe = await create_category(user, name="Кафе", image_url=None)
    date_1 = current_month_date(day=1)
    date_2 = current_month_date(day=2)
    op_1 = await create_operation(food, sum=100, date=date_1, comment="Хлеб")
    op_2 = await create_operation(cafe, sum=300, date=date_2, comment="Кофе")
    op_3 = await create_operation(
        food, sum=200, date=date_2.replace(hour=18), comment="Сыр"
    )

    response = await client.get(
        "/api/v1/categories/statistic",
        params={"operation": "spending", "year": date_1.year, "month": date_1.month},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["operation"] == "spending"
    assert (data["year"], data["month"]) == (date_1.year, date_1.month)
    assert data["total"] == 600
    assert data["cats_sum"] == {"Продукты": 300, "Кафе": 300}
    assert data["grouped_operations"] == {
        day_key(date_2): [
            {
                "id": op_3.id,
                "sum": 200,
                "comment": "Сыр",
                "cat_name": "Продукты",
                "image_url": "/static/img/food.png",
            },
            {
                "id": op_2.id,
                "sum": 300,
                "comment": "Кофе",
                "cat_name": "Кафе",
                "image_url": None,
            },
        ],
        day_key(date_1): [
            {
                "id": op_1.id,
                "sum": 100,
                "comment": "Хлеб",
                "cat_name": "Продукты",
                "image_url": "/static/img/food.png",
            },
        ],
    }
    # Дни идут от новых к старым
    assert list(data["grouped_operations"]) == [day_key(date_2), day_key(date_1)]


async def test_statistic_filters_month_type_and_user(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    other_user = await create_user()
    food = await create_category(user, is_profit=False)
    salary = await create_category(user, name="Зарплата", is_profit=True)
    other_food = await create_category(other_user)
    this_month, prev_month = current_month_date(), previous_month_date()
    current_op = await create_operation(food, sum=100, date=this_month)
    await create_operation(food, sum=1000, date=prev_month)
    await create_operation(salary, sum=5000, date=this_month)
    await create_operation(other_food, sum=7000, date=this_month)

    response = await client.get(
        "/api/v1/categories/statistic",
        params={
            "operation": "spending",
            "year": this_month.year,
            "month": this_month.month,
        },
        headers=auth_headers(user),
    )

    data = response.json()
    assert data["total"] == 100
    ops = [op for day in data["grouped_operations"].values() for op in day]
    assert [op["id"] for op in ops] == [current_op.id]
    # Месяцы, в которых у пользователя есть расходы, от новых к старым
    assert data["months_year"] == (
        {str(this_month.year): [this_month.month, prev_month.month]}
        if this_month.year == prev_month.year
        else {
            str(this_month.year): [this_month.month],
            str(prev_month.year): [prev_month.month],
        }
    )


async def test_statistic_empty_month(client, create_user):
    user = await create_user()

    response = await client.get(
        "/api/v1/categories/statistic",
        params={"operation": "profit", "year": 2000, "month": 1},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["grouped_operations"] == {}
    assert data["total"] == 0
    assert data["months_year"] == {}


@pytest.mark.parametrize(
    "params",
    [
        {"year": 2026, "month": 9},
        {"operation": "spending", "month": 9},
        {"operation": "spending", "year": 2026},
        {"operation": "spending", "year": "abc", "month": 9},
    ],
)
async def test_statistic_missing_or_invalid_params(client, create_user, params):
    user = await create_user()

    response = await client.get(
        "/api/v1/categories/statistic", params=params, headers=auth_headers(user)
    )

    assert response.status_code == 422


# ---------- POST /create ----------


@pytest.mark.parametrize(
    "operation, is_profit", [("profit", True), ("spending", False)]
)
async def test_create_category(client, create_user, operation, is_profit):
    user = await create_user()

    response = await client.post(
        "/api/v1/categories/create",
        json={"name": "Новая", "image_url": "/img.png", "operation": operation},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Категория успешно создана"
    category = await get_obj(Category, body["cr_category_id"])
    assert category.name == "Новая"
    assert category.image_url == "/img.png"
    assert category.is_profit is is_profit
    assert category.user_id == user.id


async def test_create_category_without_image(client, create_user):
    user = await create_user()

    response = await client.post(
        "/api/v1/categories/create",
        json={"name": "Без картинки", "operation": "spending"},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    category = await get_obj(Category, response.json()["cr_category_id"])
    assert category.image_url is None


@pytest.mark.parametrize("json", [{"operation": "spending"}, {"name": "Без типа"}, {}])
async def test_create_category_validation(client, create_user, json):
    user = await create_user()

    response = await client.post(
        "/api/v1/categories/create", json=json, headers=auth_headers(user)
    )

    assert response.status_code == 422


# ---------- PATCH /update ----------


async def test_update_category(client, create_user, create_category):
    user = await create_user()
    category = await create_category(user, name="Старое", image_url="/old.png")

    response = await client.patch(
        f"/api/v1/categories/update/{category.id}",
        json={"name": "Новое"},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Категория успешно обновлена",
        "upd_category_id": category.id,
    }
    updated = await get_obj(Category, category.id)
    assert updated.name == "Новое"
    # Непереданные поля не затираются
    assert updated.image_url == "/old.png"


@pytest.mark.xfail(
    reason="update_obj возвращает None, а ручка обращается к .id и падает с 500"
)
async def test_update_nonexistent_category(client, create_user):
    user = await create_user()

    response = await client.patch(
        "/api/v1/categories/update/999",
        json={"name": "Новое"},
        headers=auth_headers(user),
    )

    assert response.status_code == 404


@pytest.mark.xfail(reason="Нет проверки, что категория принадлежит пользователю")
async def test_update_category_of_other_user(client, create_user, create_category):
    user = await create_user()
    other_user = await create_user()
    other_category = await create_category(other_user, name="Чужая")

    response = await client.patch(
        f"/api/v1/categories/update/{other_category.id}",
        json={"name": "Взлом"},
        headers=auth_headers(user),
    )

    assert response.status_code == 404
    assert (await get_obj(Category, other_category.id)).name == "Чужая"


# ---------- DELETE /delete ----------


async def test_delete_category(client, create_user, create_category):
    user = await create_user()
    category = await create_category(user)

    response = await client.delete(
        f"/api/v1/categories/delete/{category.id}", headers=auth_headers(user)
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Категория успешно удалена",
        "del_category_id": category.id,
    }
    assert await get_obj(Category, category.id) is None


@pytest.mark.xfail(
    reason="У Category.operation нет cascade/passive_deletes: ORM пытается обнулить "
    "operation.category_id и падает на NOT NULL, ответ 500"
)
async def test_delete_category_with_operations(
    client, create_user, create_category, create_operation
):
    user = await create_user()
    category = await create_category(user)
    operation = await create_operation(category)

    response = await client.delete(
        f"/api/v1/categories/delete/{category.id}", headers=auth_headers(user)
    )

    assert response.status_code == 200
    assert await get_obj(Category, category.id) is None
    assert await get_obj(Operation, operation.id) is None


@pytest.mark.xfail(
    reason="delete_obj возвращает False, а ручка обращается к .id и падает с 500"
)
async def test_delete_nonexistent_category(client, create_user):
    user = await create_user()

    response = await client.delete(
        "/api/v1/categories/delete/999", headers=auth_headers(user)
    )

    assert response.status_code == 404


@pytest.mark.xfail(reason="Нет проверки, что категория принадлежит пользователю")
async def test_delete_category_of_other_user(client, create_user, create_category):
    user = await create_user()
    other_user = await create_user()
    other_category = await create_category(other_user)

    response = await client.delete(
        f"/api/v1/categories/delete/{other_category.id}", headers=auth_headers(user)
    )

    assert response.status_code == 404
    assert await get_obj(Category, other_category.id) is not None
