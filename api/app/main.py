from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.errors import install_error_handlers
from app.routers import attempts, health, llm_ping, me, questions, rubrics


def create_app() -> FastAPI:
    app = FastAPI(title="DOMIN8 API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origin_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    install_error_handlers(app)
    app.include_router(health.router)
    app.include_router(me.router)
    app.include_router(llm_ping.router)
    app.include_router(questions.router)
    app.include_router(rubrics.router)
    app.include_router(attempts.router)
    return app


app = create_app()
