import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("api")

STATUS_BY_CODE = {
    "unauthorized": 401,
    "forbidden": 403,
    "not_found": 404,
    "invalid_input": 422,
    "validation_error": 422,
    "llm_failed": 502,
    "internal": 500,
}
CODE_BY_STATUS: dict[int, str] = {}
for _code, _status in STATUS_BY_CODE.items():
    CODE_BY_STATUS.setdefault(_status, _code)  # first code wins, so a bare HTTP 422 stays invalid_input


class ApiError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = STATUS_BY_CODE[code]


def error_response(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return error_response(exc.code, exc.message, exc.status)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", []))
        return error_response("invalid_input", f"{where}: {first.get('msg', 'invalid input')}", 422)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = CODE_BY_STATUS.get(exc.status_code, "internal")
        return error_response(code, str(exc.detail), exc.status_code)

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled error", exc_info=exc)
        return error_response("internal", "Something went wrong on the server", 500)
