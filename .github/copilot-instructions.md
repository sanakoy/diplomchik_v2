Project-specific Copilot instructions — diplomchik_v2

Quick summary
- This repository contains a small FastAPI-oriented backend library under `src/` (DB + models). Key modules:
  - `src/settings.py` — pydantic-settings driven config; reads `.env` at repo root.
  - `src/database.py` — async SQLAlchemy engine, session factory, `Base` declarative base and helper `get_session` / `SessionDep`.
  - `src/auth/models.py`, `src/moneychek/models.py` — example models. Models inherit from `Base` and use `sqlalchemy.orm.mapped_column`.
  - `docker-compose.dev.yml` — two local Postgres services: `postgres` (port 5433) and `postgres_test` (port 5434).

What to know before editing
- The code uses async SQLAlchemy (engine via `create_async_engine`) and async sessionmaker. Keep DB interactions async.
- `Base` in `src/database.py` provides default columns: `id` (UUID, default uuid4), `created_at`, `updated_at`. New models should inherit `Base` and define typed `Mapped[...]` fields with `mapped_column()`.
- Config values are loaded via `pydantic_settings.BaseSettings` in `src/settings.py`. Tests expect separate `TEST_...` env vars.
- Imports inside the repo use the package-style path `diplomchik_v2.src...` in existing modules. Preserve or update imports consistently project-wide.

Developer flows & commands (discoverable)
- Start local databases used by the project:
  - docker-compose -f docker-compose.dev.yml up -d
  - The main DB is exposed on localhost:5433; the test DB on localhost:5434.
- Environment file: `.env` (at repo root) contains DB_* entries used by `src/settings.py`. Tests rely on TEST_* env vars which may need to be added to `.env` or provided in CI.
- Tests / runners: no top-level FastAPI entrypoint was found in `src/` (the repository currently provides DB & models). If you add an app, prefer ASGI/uvicorn and keep async DB session dependency names (`get_session`, `SessionDep`) to match existing helpers.

Project conventions and gotchas
- Use async DB calls only; blocking DB calls will break concurrency.
- Model columns use `Mapped[...]` annotations and `mapped_column()` — follow the style in `src/auth/models.py` and `src/moneychek/models.py`.
- Do NOT change the `Base` default columns (`id`, `created_at`, `updated_at`) shape without updating all model imports/usages.
- The project composes DB URLs like `postgresql+asyncpg://...` in `src/settings.py`. Keep the `+asyncpg` suffix for async drivers.
- Tests expect a separate test database (see `docker-compose.dev.yml` entry `postgres_test`). Ensure test env vars (`TEST_DB_*`) point to that DB.

Helpful examples (copyable patterns)
- Model skeleton:
  from diplomchik_v2.src.database import Base
  from sqlalchemy.orm import Mapped, mapped_column

  class MyModel(Base):
      __tablename__ = "my_model"
      name: Mapped[str] = mapped_column()

- Dependable session usage in FastAPI endpoints (keep the dependency name `SessionDep`):
  async def endpoint(dep_session: SessionDep):
      async with dep_session as session:
          ...

Where to look for related code
- `diplomchik_v2/src/settings.py` — env parsing and DB URL composition.
- `diplomchik_v2/src/database.py` — session creation, `Base`, helper deps.
- `diplomchik_v2/docker-compose.dev.yml` and `.env` — local DB setup and ports (5433 / 5434).
- `diplomchik_v2/src/*/models.py` — model style and examples.

If you can't find a runtime entrypoint
- The repo currently exposes DB and domain models. If you add an API entrypoint (FastAPI app), register async lifespan and the DB session dependency consistent with `get_session` and `SessionDep`.

When in doubt — what an AI agent should do
- Search for `get_session`, `SessionDep`, `mapped_column`, and `Settings` before changing DB/session code.
- Preserve the async-first approach and the UUID-based `id` primary key.
- If adding tests, ensure the test runner uses `TEST_*` env vars and points to the `postgres_test` container (port 5434).

Questions for maintainers (please clarify)
- Where is the intended application entrypoint (ASGI app) or CLI for running the service? Add path if it exists.
- Are there CI workflows or test commands that should be documented here?

End of file