# Cuentas Claras — Servidor propio de 3R Labs

Opción recomendada: todo corre en el servidor de 3R Labs con Docker y se publica con el **túnel de Cloudflare** que ya existe (el mismo de `hogar.3rlabs.cl`). No hay costos de Render ni de Vercel.

La alternativa en Render + Vercel está en [DEPLOY-3RLABS.md](DEPLOY-3RLABS.md).

## Arquitectura

```
Navegador ─► Cloudflare ─► túnel (cloudflared) ─┬─► 127.0.0.1:3000  frontend (Next.js)  ─► backend:8000 (red Docker)
                                                └─► 127.0.0.1:8000  backend (Django)     ─► db (Postgres, sin puerto expuesto)
```

| Dominio | Destino en el servidor | Uso |
|---|---|---|
| `cuentasclaras.3rlabs.cl` | `http://127.0.0.1:3000` | La app |
| `api.cuentasclaras.3rlabs.cl` | `http://127.0.0.1:8000` | Swagger (`/api/docs`) y admin (`/admin/`) |

- Cloudflare termina HTTPS.
- Los contenedores solo escuchan en `127.0.0.1`.
- Postgres no tiene ningún puerto publicado.

## 1. Levantar los contenedores

```bash
git clone https://github.com/y-jeff/Cuentas-Claras.git /opt/cuentas-claras
cd /opt/cuentas-claras
cp .env.prod.example .env
chmod 600 .env
# Completa SECRET_KEY y POSTGRES_PASSWORD con: openssl rand -hex 32
# Si 3000 u 8000 ya están ocupados, cambia WEB_PORT / API_PORT.
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Prueba local:

```bash
curl -I http://127.0.0.1:8000/api/docs                 # 200
curl -i http://127.0.0.1:3000/api/auth/me              # 401: el proxy de Next llega a Django
```

Desde `http://127.0.0.1` el login no queda guardado, porque las cookies son `Secure` y solo funcionan con HTTPS. Es normal: la app se prueba por el dominio.

## 2. Publicar con el túnel de Cloudflare

Agrega dos *public hostnames* al túnel existente, **sin tocar las reglas de `hogar.3rlabs.cl`**.

**Túnel gestionado desde el panel** (cloudflared corre con `--token`):
Cloudflare Zero Trust → Networks → Tunnels → el túnel → *Public Hostname* → **Add**:
- `cuentasclaras.3rlabs.cl` → `HTTP` → `127.0.0.1:3000`
- `api.cuentasclaras.3rlabs.cl` → `HTTP` → `127.0.0.1:8000`

Cloudflare crea los registros DNS solo.

**Túnel gestionado por archivo** (`config.yml`): agrega las reglas **antes** de la regla final `http_status:404`.

```yaml
ingress:
  # ... reglas existentes (hogar.3rlabs.cl) ...
  - hostname: cuentasclaras.3rlabs.cl
    service: http://127.0.0.1:3000
  - hostname: api.cuentasclaras.3rlabs.cl
    service: http://127.0.0.1:8000
  - service: http_status:404
```

Luego valida, crea los DNS y reinicia:

```bash
cloudflared tunnel ingress validate
cloudflared tunnel route dns <TUNEL> cuentasclaras.3rlabs.cl
cloudflared tunnel route dns <TUNEL> api.cuentasclaras.3rlabs.cl
sudo systemctl restart cloudflared
```

`route dns` necesita el `cert.pem` de `cloudflared tunnel login`. Si no lo tienes, crea en el panel de Cloudflare dos CNAME con proxy activado (nube naranja) que apunten a `<ID_DEL_TUNEL>.cfargotunnel.com`.

Si cloudflared corre **dentro de Docker**, `127.0.0.1` no es el servidor. En ese caso usa `host.docker.internal` o conecta cloudflared a la red `cuentas-claras_default` y apunta a `frontend:3000` / `backend:8000`.

## 3. Respaldo diario de la base

```bash
sudo mkdir -p /var/backups/cuentas-claras
# crontab -e (root): todos los días a las 03:30, guarda 14 días
30 3 * * * cd /opt/cuentas-claras && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U cuentas_claras cuentas_claras | gzip > /var/backups/cuentas-claras/$(date +\%F).sql.gz && find /var/backups/cuentas-claras -name '*.sql.gz' -mtime +14 -delete
```

Restaurar:

```bash
gunzip -c ARCHIVO.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U cuentas_claras cuentas_claras
```

Copia los respaldos también fuera del servidor: si el disco falla, los respaldos locales se pierden con él.

## 4. Cuentas para uso real

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

Después, `https://api.cuentasclaras.3rlabs.cl/admin/` → *Users → Add user* para cada persona. La cuenta `demo` / `demo1234` es pública y se reinicia en cada arranque: no guardar datos reales en ella.

Para que nadie de fuera llegue al formulario de login del admin, se puede proteger `api.cuentasclaras.3rlabs.cl` con **Cloudflare Access** (correo de la familia). La app no se ve afectada, porque el frontend llega a la API por la red interna de Docker.

## 5. Actualizar

```bash
cd /opt/cuentas-claras
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f
```

## 6. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `400 Bad Request` | El dominio no está en `ALLOWED_HOSTS`. | Revisa `API_DOMAIN` en `.env` y vuelve a ejecutar `up -d`. |
| `403` al iniciar sesión o al guardar | El origen no está en `CSRF_TRUSTED_ORIGINS`. | Revisa `WEB_DOMAIN` en `.env`. |
| `502` / `Bad gateway` en Cloudflare | El túnel no llega al puerto. | `docker compose ps`, `curl 127.0.0.1:3000`, y revisa la regla del túnel. |
| El login no queda guardado | Se entró por `http://`. | Usar el dominio con `https://`. |
| `hogar.3rlabs.cl` dejó de funcionar | Se cambió el orden de las reglas del túnel o un puerto chocó. | Restaurar el `config.yml` respaldado; las reglas nuevas van antes de `http_status:404`. |
| Logs | | `docker compose -f docker-compose.prod.yml logs -f backend` |
