#!/bin/sh
# Actualiza la API en el servidor de 3R Labs cuando hay commits nuevos en main.
# Pensado para cron cada 5 minutos (ver docs/DEPLOY-3RLABS.md, sección "Actualizar").
set -eu

REPO="y-jeff/Cuentas-Claras"
COMPOSE="docker compose -f docker-compose.prod.yml"

cd "$(dirname "$0")/.."

# Evita dos actualizaciones a la vez si un build tarda más que el intervalo del cron.
exec 9>/tmp/cuentas-claras-actualizar.lock
flock -n 9 || exit 0

git fetch --quiet origin main
LOCAL=$(git rev-parse HEAD)
REMOTO=$(git rev-parse origin/main)
[ "$LOCAL" = "$REMOTO" ] && exit 0

# Solo se despliega un commit cuyo CI terminó bien; si sigue corriendo, se reintenta en la próxima pasada.
ESTADO=$(curl -fsS "https://api.github.com/repos/$REPO/actions/runs?head_sha=$REMOTO&per_page=1" \
  | grep -o '"conclusion": *"[a-z_]*"' | head -n 1 | sed 's/.*"\([a-z_]*\)"$/\1/' || true)
if [ "$ESTADO" != "success" ]; then
  echo "$(date '+%F %T') $(echo "$REMOTO" | cut -c1-7): CI ${ESTADO:-en curso}, no se actualiza"
  exit 0
fi

CAMBIOS=$(git diff --name-only "$LOCAL" "$REMOTO")
# --ff-only falla si alguien editó archivos versionados en el servidor, en vez de mezclarlos.
git merge --ff-only --quiet origin/main

# El frontend lo publica Vercel: solo se reconstruye la API si cambió algo que la afecta.
if echo "$CAMBIOS" | grep -qE '^(backend/|docker-compose\.prod\.yml$)'; then
  $COMPOSE up -d --build
  docker image prune -f >/dev/null
  echo "$(date '+%F %T') API actualizada a $(git rev-parse --short HEAD)"
else
  echo "$(date '+%F %T') $(git rev-parse --short HEAD): sin cambios para la API"
fi
