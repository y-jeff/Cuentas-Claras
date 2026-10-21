from typing import Literal

from django.core.paginator import Paginator
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router, Status
from ninja.security import django_auth

from gastos.models import Categoria, Gasto
from gastos.schemas import ErrorOut, GastoIn, GastoOut, GastoPage, ResumenOut

router = Router(tags=["Gastos"], auth=django_auth)

Orden = Literal["-fecha", "fecha", "-monto", "monto"]


@router.get("", response={200: GastoPage, 400: ErrorOut, 401: ErrorOut})
def listar_gastos(
    request,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    categoria: Categoria | None = None,
    search: str = "",
    orden: Orden = "-fecha",
):
    gastos = Gasto.objects.filter(usuario=request.user)
    if categoria:
        gastos = gastos.filter(categoria=categoria)
    if search.strip():
        gastos = gastos.filter(descripcion__icontains=search.strip())
    gastos = gastos.order_by(orden, "-id")

    paginator = Paginator(gastos, page_size)
    pagina = paginator.get_page(page)
    return {
        "items": list(pagina.object_list),
        "count": paginator.count,
        "page": pagina.number,
        "page_size": page_size,
        "total_pages": paginator.num_pages,
    }


@router.get("/resumen", response={200: ResumenOut, 401: ErrorOut})
def resumen_mes(request):
    hoy = timezone.localdate()
    gastos = Gasto.objects.filter(
        usuario=request.user, fecha__year=hoy.year, fecha__month=hoy.month
    )
    totales = gastos.aggregate(total=Sum("monto"), cantidad=Count("id"))
    por_categoria = {
        fila["categoria"]: fila
        for fila in gastos.values("categoria").annotate(total=Sum("monto"), cantidad=Count("id"))
    }
    return {
        "mes": hoy.strftime("%Y-%m"),
        "total": totales["total"] or 0,
        "cantidad": totales["cantidad"],
        "por_categoria": [
            {
                "categoria": categoria,
                "total": por_categoria.get(categoria, {}).get("total", 0),
                "cantidad": por_categoria.get(categoria, {}).get("cantidad", 0),
            }
            for categoria in Categoria.values
        ],
    }


@router.post("", response={201: GastoOut, 400: ErrorOut, 401: ErrorOut, 403: ErrorOut})
def crear_gasto(request, payload: GastoIn):
    gasto = Gasto.objects.create(usuario=request.user, **payload.dict())
    return Status(201, gasto)


@router.get("/{gasto_id}", response={200: GastoOut, 401: ErrorOut, 404: ErrorOut})
def obtener_gasto(request, gasto_id: int):
    return get_object_or_404(Gasto, id=gasto_id, usuario=request.user)


@router.put(
    "/{gasto_id}", response={200: GastoOut, 400: ErrorOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut}
)
def actualizar_gasto(request, gasto_id: int, payload: GastoIn):
    gasto = get_object_or_404(Gasto, id=gasto_id, usuario=request.user)
    for campo, valor in payload.dict().items():
        setattr(gasto, campo, valor)
    gasto.save()
    return gasto


@router.delete("/{gasto_id}", response={204: None, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def eliminar_gasto(request, gasto_id: int):
    gasto = get_object_or_404(Gasto, id=gasto_id, usuario=request.user)
    gasto.delete()
    return Status(204, None)
