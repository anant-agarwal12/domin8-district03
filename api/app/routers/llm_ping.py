from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app import llm
from app.auth import CurrentUser, current_user
from app.config import Settings, get_settings

router = APIRouter()

PING_PROMPT = "Reply with exactly one short sentence confirming you are working."


class Ping(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model: str
    reply: str
    cached: bool


@router.get("/llm/ping", response_model=Ping)
def ping(_: CurrentUser = Depends(current_user), settings: Settings = Depends(get_settings)) -> Ping:
    result = llm.generate(PING_PROMPT, temperature=0.0, settings=settings)
    return Ping(model=result.model, reply=result.text.strip(), cached=result.cached)
