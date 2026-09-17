from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.settings import settings
from src.plan.api.v1.views import plan
from src.operation.api.v1.views import operation
from src.category.api.v1.views import category
from src.auth.api.v1.views import auth

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(category, prefix="/api/v1/categories", tags=["categories"])
app.include_router(auth, prefix="/api/v1/auth", tags=["auth"])
app.include_router(operation, prefix="/api/v1/operations", tags=["operations"])
app.include_router(plan, prefix="/api/v1/plan", tags=["plan"])
