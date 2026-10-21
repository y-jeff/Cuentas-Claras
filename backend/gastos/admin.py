from django.contrib import admin

from gastos.models import Gasto


@admin.register(Gasto)
class GastoAdmin(admin.ModelAdmin):
    list_display = ["descripcion", "monto", "categoria", "fecha", "usuario"]
    list_filter = ["categoria", "fecha"]
    search_fields = ["descripcion"]
