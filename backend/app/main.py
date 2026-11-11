from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from dotenv import load_dotenv

from app.database import Base, create_database
from app.routers import addresses, assistant, cart, orders, products, session

DATABASE_URL = f"sqlite:///{Path(__file__).resolve().parents[1] / 'shopping.db'}"
# Load backend/.env regardless of the working directory used to start uvicorn.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
engine, session_factory = create_database(DATABASE_URL)


def create_app(database_url: str | None = None) -> FastAPI:
    active_engine, active_session_factory = (
        create_database(database_url) if database_url else (engine, session_factory)
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        Base.metadata.create_all(active_engine)
        yield
        if database_url:
            active_engine.dispose()

    app = FastAPI(title="Shopping Demo API", lifespan=lifespan)
    app.include_router(products.router)
    app.include_router(assistant.router)
    app.include_router(session.router)
    app.include_router(addresses.router)
    app.include_router(cart.router)
    app.include_router(orders.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.state.engine = active_engine
    app.state.session_factory = active_session_factory
    return app


app = create_app()
