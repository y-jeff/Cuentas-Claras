from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from gastos.models import Gasto

pytestmark = pytest.mark.django_db

HOY = timezone.localdate


@pytest.fixture
def usuario():
    return get_user_model().objects.create_user(username="ana", password="clave-segura-1")


@pytest.fixture
def otro_usuario():
    return get_user_model().objects.create_user(username="beto", password="clave-segura-2")


@pytest.fixture
def cliente(usuario):
    c = Client()
    c.force_login(usuario)
    return c


def crear_gasto(usuario, **datos):
    valores = {"descripcion": "Almuerzo", "monto": 8000, "categoria": "comida", "fecha": HOY()}
    valores.update(datos)
    return Gasto.objects.create(usuario=usuario, **valores)


def payload(**datos):
    valores = {
        "descripcion": "Supermercado",
        "monto": 25000,
        "categoria": "comida",
        "fecha": HOY().isoformat(),
    }
    valores.update(datos)
    return valores


class TestAutenticacion:
    def test_login_correcto_crea_sesion(self, usuario):
        c = Client()
        r = c.post(
            "/api/auth/login",
            {"username": "ana", "password": "clave-segura-1"},
            content_type="application/json",
        )
        assert r.status_code == 200
        assert r.json()["username"] == "ana"
        assert c.get("/api/auth/me").status_code == 200

    def test_login_incorrecto_devuelve_401(self, usuario):
        r = Client().post(
            "/api/auth/login",
            {"username": "ana", "password": "incorrecta"},
            content_type="application/json",
        )
        assert r.status_code == 401
        assert r.json()["detail"] == "Usuario o contraseña incorrectos."

    def test_endpoints_protegidos_sin_sesion_devuelven_401(self):
        r = Client().get("/api/gastos")
        assert r.status_code == 401
        assert "sesión" in r.json()["detail"]

    def test_escritura_sin_token_csrf_es_rechazada(self, usuario):
        c = Client(enforce_csrf_checks=True)
        c.force_login(usuario)
        r = c.post("/api/gastos", payload(), content_type="application/json")
        assert r.status_code == 403


class TestListado:
    def test_pagina_resultados(self, cliente, usuario):
        for i in range(12):
            crear_gasto(usuario, descripcion=f"Gasto {i}")

        r = cliente.get("/api/gastos", {"page": 2, "page_size": 5})
        datos = r.json()
        assert r.status_code == 200
        assert datos["count"] == 12
        assert datos["page"] == 2
        assert datos["total_pages"] == 3
        assert len(datos["items"]) == 5

    def test_filtra_por_categoria_y_busqueda(self, cliente, usuario):
        crear_gasto(usuario, descripcion="Uber al aeropuerto", categoria="transporte")
        crear_gasto(usuario, descripcion="Uber Eats", categoria="comida")
        crear_gasto(usuario, descripcion="Bencina", categoria="transporte")

        r = cliente.get("/api/gastos", {"categoria": "transporte", "search": "uber"})
        descripciones = [g["descripcion"] for g in r.json()["items"]]
        assert descripciones == ["Uber al aeropuerto"]

    def test_ordena_por_monto(self, cliente, usuario):
        for monto in (300, 100, 200):
            crear_gasto(usuario, monto=monto)

        r = cliente.get("/api/gastos", {"orden": "monto"})
        assert [g["monto"] for g in r.json()["items"]] == [100, 200, 300]

    def test_solo_muestra_gastos_propios(self, cliente, usuario, otro_usuario):
        crear_gasto(usuario)
        crear_gasto(otro_usuario)
        assert cliente.get("/api/gastos").json()["count"] == 1

    def test_parametro_invalido_devuelve_400(self, cliente):
        r = cliente.get("/api/gastos", {"categoria": "viajes"})
        assert r.status_code == 400
        assert "categoria" in r.json()["errors"]


class TestCreacion:
    def test_crea_gasto_valido(self, cliente):
        r = cliente.post("/api/gastos", payload(), content_type="application/json")
        assert r.status_code == 201
        assert r.json()["descripcion"] == "Supermercado"
        assert Gasto.objects.count() == 1

    def test_devuelve_errores_por_campo(self, cliente):
        manana = (HOY() + timedelta(days=1)).isoformat()
        r = cliente.post(
            "/api/gastos",
            payload(monto=0, fecha=manana, descripcion="  a "),
            content_type="application/json",
        )
        errores = r.json()["errors"]
        assert r.status_code == 400
        assert errores["monto"] == ["El monto debe ser mayor a 0."]
        assert errores["fecha"] == ["La fecha no puede ser futura."]
        assert errores["descripcion"] == ["Debe tener al menos 3 caracteres."]
        assert Gasto.objects.count() == 0

    def test_campo_faltante(self, cliente):
        datos = payload()
        del datos["categoria"]
        r = cliente.post("/api/gastos", datos, content_type="application/json")
        assert r.status_code == 400
        assert r.json()["errors"]["categoria"] == ["Este campo es obligatorio."]


class TestEdicionYEliminacion:
    def test_actualiza_gasto(self, cliente, usuario):
        gasto = crear_gasto(usuario)
        r = cliente.put(
            f"/api/gastos/{gasto.id}", payload(monto=9990), content_type="application/json"
        )
        assert r.status_code == 200
        gasto.refresh_from_db()
        assert gasto.monto == 9990

    def test_elimina_gasto(self, cliente, usuario):
        gasto = crear_gasto(usuario)
        assert cliente.delete(f"/api/gastos/{gasto.id}").status_code == 204
        assert not Gasto.objects.exists()

    def test_no_puede_tocar_gastos_ajenos(self, cliente, otro_usuario):
        ajeno = crear_gasto(otro_usuario)
        assert cliente.get(f"/api/gastos/{ajeno.id}").status_code == 404
        assert cliente.delete(f"/api/gastos/{ajeno.id}").status_code == 404
        assert Gasto.objects.filter(id=ajeno.id).exists()


class TestResumen:
    def test_suma_solo_el_mes_actual(self, cliente, usuario):
        crear_gasto(usuario, monto=1000, categoria="comida")
        crear_gasto(usuario, monto=500, categoria="ocio")
        crear_gasto(usuario, monto=9999, fecha=HOY().replace(day=1) - timedelta(days=1))

        datos = cliente.get("/api/gastos/resumen").json()
        por_categoria = {c["categoria"]: c["total"] for c in datos["por_categoria"]}
        assert datos["total"] == 1500
        assert datos["cantidad"] == 2
        assert por_categoria["comida"] == 1000
        assert por_categoria["hogar"] == 0
