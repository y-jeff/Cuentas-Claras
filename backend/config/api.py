import logging

from django.http import Http404
from ninja import NinjaAPI
from ninja.errors import AuthenticationError, ValidationError

from gastos.api import router as gastos_router
from gastos.auth_api import router as auth_router

logger = logging.getLogger(__name__)

api = NinjaAPI(
    title="Cuentas Claras API",
    version="1.0.0",
    description=(
        "API REST de Cuentas Claras, registro de gastos del hogar. "
        "Autenticación por sesión (cookie HttpOnly) + CSRF."
    ),
)

api.add_router("/auth", auth_router)
api.add_router("/gastos", gastos_router)


# Mensajes en español para los errores de validación más comunes de Pydantic.
MENSAJES_VALIDACION = {
    "missing": "Este campo es obligatorio.",
    "string_type": "Debe ser texto.",
    "int_type": "Debe ser un número entero.",
    "int_parsing": "Debe ser un número entero.",
    "int_from_float": "Debe ser un número entero.",
    "date_type": "Fecha inválida.",
    "date_parsing": "Fecha inválida.",
    "date_from_datetime_parsing": "Fecha inválida.",
    "enum": "Selecciona una opción válida.",
    "literal_error": "Selecciona una opción válida.",
    "greater_than_equal": "Valor fuera de rango.",
    "less_than_equal": "Valor fuera de rango.",
    "json_invalid": "El cuerpo de la petición no es JSON válido.",
}

UBICACIONES_IGNORADAS = {"body", "query", "path", "payload"}


def _campo(loc: tuple) -> str:
    partes = [str(p) for p in loc if p not in UBICACIONES_IGNORADAS]
    return ".".join(partes) or "__all__"


def _mensaje(error: dict) -> str:
    if error["type"] == "value_error":
        return error["msg"].removeprefix("Value error, ")
    return MENSAJES_VALIDACION.get(error["type"], error["msg"])


@api.exception_handler(ValidationError)
def error_validacion(request, exc: ValidationError):
    errores: dict[str, list[str]] = {}
    for error in exc.errors:
        errores.setdefault(_campo(error["loc"]), []).append(_mensaje(error))
    return api.create_response(
        request, {"detail": "Revisa los datos enviados.", "errors": errores}, status=400
    )


@api.exception_handler(AuthenticationError)
def error_autenticacion(request, exc):
    return api.create_response(
        request, {"detail": "Tu sesión expiró o no has iniciado sesión."}, status=401
    )


@api.exception_handler(Http404)
def no_encontrado(request, exc):
    return api.create_response(request, {"detail": "Recurso no encontrado."}, status=404)


@api.exception_handler(Exception)
def error_interno(request, exc):
    logger.exception("Error no controlado en %s %s", request.method, request.path)
    return api.create_response(request, {"detail": "Error interno del servidor."}, status=500)
