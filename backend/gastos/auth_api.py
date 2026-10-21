from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from ninja import Router, Status
from ninja.security import django_auth

from gastos.schemas import ErrorOut, LoginIn, UsuarioOut

router = Router(tags=["Autenticación"])


@router.post("/login", response={200: UsuarioOut, 400: ErrorOut, 401: ErrorOut})
def iniciar_sesion(request, payload: LoginIn):
    usuario = authenticate(request, username=payload.username, password=payload.password)
    if usuario is None:
        return Status(401, {"detail": "Usuario o contraseña incorrectos."})
    # login() rota la sesión y el token CSRF; el middleware envía la cookie csrftoken nueva.
    login(request, usuario)
    return Status(200, usuario)


@router.post("/logout", auth=django_auth, response={204: None, 401: ErrorOut, 403: ErrorOut})
def cerrar_sesion(request):
    logout(request)
    return Status(204, None)


@router.get("/me", auth=django_auth, response={200: UsuarioOut, 401: ErrorOut})
def usuario_actual(request):
    # Garantiza que el navegador tenga la cookie csrftoken antes de hacer POST/PUT/DELETE.
    get_token(request)
    return Status(200, request.user)
