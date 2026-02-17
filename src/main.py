from fastapi import FastAPI
from src.category.api.v1.views import category
from src.auth.api.v1.views import auth

app = FastAPI()


app.include_router(category, prefix="/api/v1/categories", tags=["categories"])
app.include_router(auth, prefix="/api/v1/auth", tags=["auth"])
