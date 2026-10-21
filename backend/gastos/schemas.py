from datetime import date, datetime

from django.utils import timezone
from ninja import Schema
from pydantic import field_validator

from gastos.models import Categoria

MONTO_MAXIMO = 10_000_000


class ErrorOut(Schema):
    detail: str
    errors: dict[str, list[str]] | None = None


class LoginIn(Schema):
    username: str
    password: str


class UsuarioOut(Schema):
    id: int
    username: str
    first_name: str


class GastoIn(Schema):
    descripcion: str
    monto: int
    categoria: Categoria
    fecha: date

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, valor: str) -> str:
        valor = valor.strip()
        if len(valor) < 3:
            raise ValueError("Debe tener al menos 3 caracteres.")
        if len(valor) > 120:
            raise ValueError("No puede superar los 120 caracteres.")
        return valor

    @field_validator("monto")
    @classmethod
    def validar_monto(cls, valor: int) -> int:
        if valor <= 0:
            raise ValueError("El monto debe ser mayor a 0.")
        if valor > MONTO_MAXIMO:
            raise ValueError("El monto no puede superar $10.000.000.")
        return valor

    @field_validator("fecha")
    @classmethod
    def validar_fecha(cls, valor: date) -> date:
        if valor > timezone.localdate():
            raise ValueError("La fecha no puede ser futura.")
        return valor


class GastoOut(Schema):
    id: int
    descripcion: str
    monto: int
    categoria: Categoria
    fecha: date
    creado: datetime


class GastoPage(Schema):
    items: list[GastoOut]
    count: int
    page: int
    page_size: int
    total_pages: int


class CategoriaTotal(Schema):
    categoria: Categoria
    total: int
    cantidad: int


class ResumenOut(Schema):
    mes: str
    total: int
    cantidad: int
    por_categoria: list[CategoriaTotal]
