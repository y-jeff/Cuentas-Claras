# Cuentas Claras — Puesta en marcha en 3R Labs

Modelo **híbrido**:
- La **API** corre en el servidor de 3R Labs, liviana: un contenedor con SQLite y un solo proceso.
- El **frontend** corre en **Vercel**, que se encarga del build pesado de Next.js.

Ninguna de las dos partes tiene costo.

- **Repositorio:** https://github.com/y-jeff/Cuentas-Claras (rama `main`)
- **Responsable:** y-jeff

---

## 1. Resumen

| Pieza | Dónde | Dominio |
|---|---|---|
| Frontend (Next.js 16) | Vercel (plan Hobby) | `https://cuentasclaras.3rlabs.cl` |
| API (Django 5.2 + Django Ninja) + SQLite | Servidor de 3R Labs, Docker, publicado con el túnel de Cloudflare | `https://api-cuentasclaras.3rlabs.cl` |

```
Navegador ──► cuentasclaras.3rlabs.cl (Vercel)
                 └─ /api/*  ── proxy ──►  api-cuentasclaras.3rlabs.cl ──► Cloudflare ──► túnel ──► 127.0.0.1:8000 (API) ──► ./data/db.sqlite3
```

- El navegador **solo habla con `cuentasclaras.3rlabs.cl`**. Vercel reenvía `/api/*` a la API, así que la cookie de sesión es del dominio de la app: no hay CORS ni cookies de terceros.
- Desde el navegador, `api-cuentasclaras.3rlabs.cl` solo se usa para Swagger (`/api/docs`) y el admin (`/admin/`).
- **Carga en el servidor:** un contenedor de Python con límite de 256 MB de RAM (consume unos 80–100 MB). El build de la imagen solo instala dependencias de Python, sin compilar el frontend.

---

## 2. Lo que se necesita

- [ ] Servidor de 3R Labs con **Docker** y el plugin **docker compose**.
- [ ] El **túnel de Cloudflare** que ya publica `hogar.3rlabs.cl`, y acceso a su configuración: el panel de Zero Trust o su `config.yml`.
- [ ] Acceso a la zona DNS de `3rlabs.cl` en Cloudflare.
- [ ] Una cuenta de **Vercel** con acceso al repo de GitHub `y-jeff/Cuentas-Claras`.

---

## 3. Paso 1 — API en el servidor

```bash
git clone https://github.com/y-jeff/Cuentas-Claras.git /opt/cuentas-claras
cd /opt/cuentas-claras
cp .env.prod.example .env
chmod 600 .env
# SECRET_KEY: openssl rand -hex 32. Si el puerto 8000 está ocupado, cambia API_PORT.
mkdir -p data/backups
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # estado "healthy" tras ~30 s
```

Cada vez que arranca, el contenedor:
1. aplica las migraciones;
2. reinicia la cuenta demo (`seed`), **que solo toca al usuario `demo`**;
3. levanta Gunicorn.

La base vive en `/opt/cuentas-claras/data/db.sqlite3`.

Prueba local:

```bash
curl -I http://127.0.0.1:8000/api/docs           # 200
curl -i http://127.0.0.1:8000/api/auth/me        # 401 (sin sesión)
```

### Variables (`.env`)

| Variable | Valor | Para qué sirve |
|---|---|---|
| `SECRET_KEY` | `openssl rand -hex 32` | Firma sesiones y CSRF. No compartirla. |
| `WEB_DOMAIN` | `cuentasclaras.3rlabs.cl` | Origen permitido para `POST/PUT/DELETE`. |
| `API_DOMAIN` | `api-cuentasclaras.3rlabs.cl` | Dominio que acepta la API (`ALLOWED_HOSTS`). |
| `API_PORT` | `8000` | Puerto local, solo en `127.0.0.1`. |

---

## 4. Paso 2 — Publicar la API con el túnel

Agrega **un** hostname al túnel existente, **sin tocar las reglas de `hogar.3rlabs.cl`**.

**Túnel gestionado desde el panel** (cloudflared corre con `--token`):
Cloudflare Zero Trust → Networks → Tunnels → el túnel → *Public Hostname* → **Add**:
`api-cuentasclaras.3rlabs.cl` → `HTTP` → `127.0.0.1:8000`. Cloudflare crea el registro DNS solo.

**Túnel gestionado por archivo** (`config.yml`): respalda el archivo y agrega la regla **antes** de la regla final `http_status:404`.

```yaml
ingress:
  # ... reglas existentes (hogar.3rlabs.cl) ...
  - hostname: api-cuentasclaras.3rlabs.cl
    service: http://127.0.0.1:8000
  - service: http_status:404
```

```bash
cloudflared tunnel ingress validate
cloudflared tunnel route dns <TUNEL> api-cuentasclaras.3rlabs.cl   # requiere cert.pem
sudo systemctl restart cloudflared
```

- Si no hay `cert.pem`, crea el DNS en el panel: `CNAME api-cuentasclaras → <ID_DEL_TUNEL>.cfargotunnel.com`, con proxy activado (nube naranja).
- Si cloudflared corre **dentro de Docker**, `127.0.0.1` no es el servidor. Usa `host.docker.internal:8000`, o conecta cloudflared a la red `cuentas-claras_default` y apunta a `api:8000`.

Comprobar:

```bash
curl -I https://api-cuentasclaras.3rlabs.cl/api/docs     # 200
```

---

## 5. Paso 3 — Frontend en Vercel

1. Vercel → **Add New → Project** → importa `y-jeff/Cuentas-Claras`.
2. **Root Directory:** `frontend`. Framework: Next.js, que Vercel detecta solo.
3. **Environment Variables** (Production):

   | Variable | Valor |
   |---|---|
   | `BACKEND_URL` | `https://api-cuentasclaras.3rlabs.cl` |

   `BACKEND_URL` se lee **durante el build**. Si se cambia, hay que hacer **Redeploy**.
4. **Deploy.**
5. **Settings → Domains** → agrega `cuentasclaras.3rlabs.cl`.
6. En Cloudflare DNS, crea el registro que indique Vercel, normalmente `CNAME cuentasclaras → cname.vercel-dns.com`, en modo **"DNS only" (nube gris)**. Con proxy, Vercel no puede emitir su certificado.

> Vercel Hobby es gratis solo para uso **no comercial**. Si 3R Labs cobra algún día por la app, hay que pasar a Vercel Pro.

---

## 6. Paso 4 — Comprobar que funciona

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | `https://api-cuentasclaras.3rlabs.cl/api/docs` | Swagger con el título **"Cuentas Claras API"**. |
| 2 | `https://cuentasclaras.3rlabs.cl` | Redirige a `/login` y muestra "Cuentas Claras". |
| 3 | **"Entrar como demo"** | Dashboard con unos 80 gastos de ejemplo. |
| 4 | Crear, editar y eliminar un gasto | Los cambios siguen ahí al recargar. |
| 5 | Crear un gasto con **fecha futura** | Aparece un error bajo el campo fecha (lo valida la API). |
| 6 | Cerrar sesión | Vuelve a `/login`; `/dashboard` ya no se puede abrir. |
| 7 | `https://api-cuentasclaras.3rlabs.cl/admin/` | Login del admin de Django, con estilos. |
| 8 | `https://hogar.3rlabs.cl` | Sigue funcionando igual que antes. |

```bash
curl -i https://cuentasclaras.3rlabs.cl/api/auth/me     # 401: Vercel llega a la API por el túnel
```

---

## 7. Respaldo diario

SQLite se respalda con la API de backup de SQLite. Es seguro hacerlo con la app funcionando.

```bash
# crontab -e (root): todos los días a las 03:30, guarda 14 días
30 3 * * * cd /opt/cuentas-claras && docker compose -f docker-compose.prod.yml exec -T api python -c "import sqlite3, datetime; sqlite3.connect('/data/db.sqlite3').backup(sqlite3.connect('/data/backups/' + str(datetime.date.today()) + '.sqlite3'))" && find data/backups -name '*.sqlite3' -mtime +14 -delete
```

Restaurar:

```bash
cd /opt/cuentas-claras
docker compose -f docker-compose.prod.yml stop api
cp data/backups/AAAA-MM-DD.sqlite3 data/db.sqlite3
rm -f data/db.sqlite3-wal data/db.sqlite3-shm
docker compose -f docker-compose.prod.yml start api
```

Copia los respaldos también fuera del servidor: si el disco falla, los respaldos locales se pierden con él.

---

## 8. Cuentas para uso real

No hay registro abierto. Cada usuario ve **solo sus propios gastos**.

```bash
docker compose -f docker-compose.prod.yml exec api python manage.py createsuperuser
```

Luego `https://api-cuentasclaras.3rlabs.cl/admin/` → **Users → Add user** para cada persona (mínimo 8 caracteres). El *First name* es el nombre que aparece en el header. La sesión dura 8 horas.

- La cuenta `demo` / `demo1234` es pública y se reinicia en cada arranque: no guardar datos reales en ella.
- **Opcional:** proteger el admin con **Cloudflare Access**. Crea una aplicación para `api-cuentasclaras.3rlabs.cl` con **ruta `/admin`**, permitida solo a los correos de la familia. **No protejas todo el dominio de la API**: Vercel necesita llegar a `/api/*` sin login.

---

## 9. Actualizar

- **Frontend:** se publica solo al hacer `git push` a `main`.
- **API:**

```bash
cd /opt/cuentas-claras
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f
```

---

## 10. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `400 Bad Request` en la API | El dominio no está en `ALLOWED_HOSTS`. | Revisa `API_DOMAIN` en `.env` y vuelve a ejecutar `up -d`. |
| `403` al iniciar sesión o al guardar | El origen no está en `CSRF_TRUSTED_ORIGINS`. | Revisa `WEB_DOMAIN` en `.env`. |
| El login falla con 5xx o error de red, pero `/api/docs` funciona por el navegador | Cloudflare bloquea las requests de Vercel (*Bot Fight Mode*, reglas WAF o Access sobre todo el dominio). | En Cloudflare → Security → Events, busca requests bloqueadas hacia `api-cuentasclaras`. Desactiva lo que las bloquea, o limita Access a `/admin`. |
| `502` / `Bad gateway` en Cloudflare | El túnel no llega al puerto. | `docker compose -f docker-compose.prod.yml ps`, `curl 127.0.0.1:8000/api/docs` y revisa la regla del túnel. |
| Vercel no emite el certificado | El CNAME de `cuentasclaras` tiene el proxy activado. | Ponlo en "DNS only". |
| El login no queda guardado | Se entró por `http://`. | Usar siempre `https://`. |
| `database is locked` en los logs | Escrituras muy simultáneas. | Con el uso de una familia no debería pasar. Si se repite, migrar a Postgres. |
| `hogar.3rlabs.cl` dejó de funcionar | Se cambió el orden de las reglas del túnel o hubo un choque de puertos. | Restaurar el `config.yml` respaldado. |

Logs: `docker compose -f docker-compose.prod.yml logs -f api`

---

## 11. Checklist final

- [ ] La API está en estado `healthy` en el servidor y `data/db.sqlite3` existe.
- [ ] El túnel publica `api-cuentasclaras.3rlabs.cl` con HTTPS.
- [ ] Vercel tiene root `frontend` y `BACKEND_URL=https://api-cuentasclaras.3rlabs.cl`.
- [ ] El dominio `cuentasclaras.3rlabs.cl` está verificado en Vercel, con el CNAME en "DNS only".
- [ ] Las 8 pruebas de la sección 6 pasan.
- [ ] El cron de respaldo está configurado y ya existe un primer respaldo manual.
- [ ] Superusuario creado y cuentas de la familia dadas de alta.
