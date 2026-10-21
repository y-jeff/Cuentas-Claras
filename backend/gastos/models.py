from django.conf import settings
from django.db import models


class Categoria(models.TextChoices):
    COMIDA = "comida", "Comida"
    TRANSPORTE = "transporte", "Transporte"
    HOGAR = "hogar", "Hogar"
    OCIO = "ocio", "Ocio"
    OTROS = "otros", "Otros"


class Gasto(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gastos"
    )
    descripcion = models.CharField(max_length=120)
    monto = models.PositiveIntegerField(help_text="Monto en pesos chilenos (CLP)")
    categoria = models.CharField(max_length=20, choices=Categoria.choices)
    fecha = models.DateField()
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha", "-id"]
        indexes = [models.Index(fields=["usuario", "fecha"])]
        constraints = [
            models.CheckConstraint(condition=models.Q(monto__gt=0), name="gasto_monto_positivo"),
        ]

    def __str__(self):
        return f"{self.descripcion} (${self.monto})"
