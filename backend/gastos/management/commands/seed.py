import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from gastos.models import Categoria, Gasto

USUARIO_DEMO = "demo"
PASSWORD_DEMO = "demo1234"

EJEMPLOS = {
    Categoria.COMIDA: [("Supermercado Líder", 15_000, 85_000), ("Almuerzo", 5_000, 14_000),
                       ("Café", 2_000, 4_500), ("Pedido delivery", 9_000, 25_000)],
    Categoria.TRANSPORTE: [("Carga tarjeta Bip!", 5_000, 20_000), ("Uber", 3_500, 15_000),
                           ("Bencina", 20_000, 60_000), ("Estacionamiento", 1_500, 6_000)],
    Categoria.HOGAR: [("Cuenta de luz", 25_000, 55_000), ("Cuenta de agua", 12_000, 30_000),
                      ("Internet", 19_990, 29_990), ("Artículos de limpieza", 6_000, 18_000)],
    Categoria.OCIO: [("Cine", 6_000, 16_000), ("Suscripción streaming", 5_990, 12_990),
                     ("Salida con amigos", 15_000, 45_000), ("Libro", 10_000, 25_000)],
    Categoria.OTROS: [("Farmacia", 4_000, 30_000), ("Regalo cumpleaños", 15_000, 40_000),
                      ("Corte de pelo", 8_000, 15_000)],
}


class Command(BaseCommand):
    help = f"Crea el usuario demo ({USUARIO_DEMO} / {PASSWORD_DEMO}) con gastos de los últimos 90 días."

    def add_arguments(self, parser):
        parser.add_argument("--cantidad", type=int, default=80)

    def handle(self, *args, cantidad, **options):
        User = get_user_model()
        usuario, _ = User.objects.get_or_create(
            username=USUARIO_DEMO, defaults={"first_name": "Usuario Demo"}
        )
        usuario.set_password(PASSWORD_DEMO)
        usuario.save()

        # Idempotente: cada ejecución deja la cuenta demo en el mismo estado inicial.
        Gasto.objects.filter(usuario=usuario).delete()

        rng = random.Random(42)
        hoy = timezone.localdate()
        gastos = []
        for _ in range(cantidad):
            categoria = rng.choice(list(EJEMPLOS))
            descripcion, minimo, maximo = rng.choice(EJEMPLOS[categoria])
            gastos.append(
                Gasto(
                    usuario=usuario,
                    descripcion=descripcion,
                    monto=round(rng.randint(minimo, maximo), -1),
                    categoria=categoria,
                    fecha=hoy - timedelta(days=rng.randint(0, 89)),
                )
            )
        Gasto.objects.bulk_create(gastos)

        self.stdout.write(
            self.style.SUCCESS(f"Usuario '{USUARIO_DEMO}' listo con {cantidad} gastos.")
        )
