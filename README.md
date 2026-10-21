# Cuentas Claras — Next.js + Django API

[![CI](https://github.com/y-jeff/Cuentas-Claras/actions/workflows/ci.yml/badge.svg)](https://github.com/y-jeff/Cuentas-Claras/actions/workflows/ci.yml)

> *Cuentas claras conservan la amistad.* Un proyecto de [3rlabs](https://3rlabs.cl).

Registro de gastos del hogar con **arquitectura desacoplada**: un frontend en **Next.js 16 + TypeScript** que consume una **API REST en Django Ninja**, conectados por un contrato OpenAPI tipado de punta a punta.

| | |
|---|---|
| **App** | https://cuentasclaras.3rlabs.cl — botón **"Entrar como demo"** |
| **API docs (Swagger)** | https://api.cuentasclaras.3rlabs.cl/api/docs |
| **Cuenta demo** | `demo` / `demo1234` |

<!-- Agrega una captura: docs/screenshot.png -->

## Qué demuestra este proyecto

- **API REST documentada** con OpenAPI/Swagger generado automáticamente (`/api/docs`).
- **Autenticación por sesión en cookie HttpOnly** + protección **CSRF** (nada de tokens en `localStorage`).
- **Paginación, filtros, búsqueda y orden en el servidor**: `GET /api/gastos?page=2&categoria=transporte&search=uber&orden=-monto`.
- **Errores HTTP semánticos** en un formato único: `400` con errores por campo, `401` sesión expirada, `403` CSRF, `404`, `500` controlado.
- **Contrato tipado**: los tipos TypeScript se **generan** desde el OpenAPI de Django, y el CI falla si el contrato commiteado queda desactualizado.
- **Formulario con React Hook Form + Zod**: los errores 400 de Django se muestran bajo cada input.
- **Estados asíncronos visibles**: skeletons, estado vacío, toasts ante fallas de red y **eliminación optimista** con rollback.
- **Búsqueda en vivo con debounce** y paginación sin parpadeos (`keepPreviousData`).
- **Tests** con pytest sobre Postgres real y **CI en GitHub Actions** (backend, frontend y contrato).
- **`docker compose up`** levanta Postgres + API + frontend con datos de prueba.

## Arquitectura

```
 Navegador ──► Next.js (Vercel)                    Django Ninja (Render) ──► PostgreSQL
               ├─ /login, /dashboard (React)
               └─ /api/*  ── rewrite (proxy) ──►   /api/auth/*, /api/gastos/*
```

El navegador **solo habla con el dominio del frontend**. Next reenvía `/api/*` a Django mediante `rewrites`, así que la cookie de sesión es *first-party*: puede ser `HttpOnly` + `SameSite=Lax` sin configurar CORS ni cookies de terceros, que los navegadores bloquean cada vez más.

**Flujo de autenticación**

1. `POST /api/auth/login`: Django valida las credenciales y crea la sesión (`sessionid`, HttpOnly).
2. Django rota el token CSRF y envía la cookie `csrftoken` (legible por JS).
3. Cada `POST/PUT/DELETE` envía el header `X-CSRFToken`. Sin él, Django responde `403`.
4. Si la sesión expira, cualquier `401` redirige a `/login` y se limpia la caché del cliente.

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript estricto, Tailwind CSS 4, TanStack Query, React Hook Form, Zod, Sonner |
| Backend | Django 5.2 LTS, Django Ninja (Pydantic), PostgreSQL, Gunicorn, WhiteNoise |
| Contrato | OpenAPI 3 → `openapi-typescript` |
| Calidad | pytest + pytest-django, ESLint, `tsc`, GitHub Actions |
| Infra | Docker, docker compose, Vercel (frontend), Render + Postgres (backend) |

## Probarlo en local

### Opción A — Docker (un comando)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000 (entra con **"Entrar como demo"**)
- Swagger: http://localhost:8000/api/docs

### Opción B — Sin Docker

```bash
# Backend (usa SQLite si no defines DATABASE_URL)
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed          # crea demo/demo1234 con 80 gastos
python manage.py runserver

# Frontend (otra terminal)
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Inicia sesión |
| `POST` | `/api/auth/logout` | Cierra sesión |
| `GET` | `/api/auth/me` | Usuario actual |
| `GET` | `/api/gastos` | Lista paginada. Query: `page`, `page_size`, `categoria`, `search`, `orden` |
| `POST` | `/api/gastos` | Crea un gasto |
| `GET` / `PUT` / `DELETE` | `/api/gastos/{id}` | Detalle, edición y eliminación |
| `GET` | `/api/gastos/resumen` | Totales del mes por categoría |

Todas las respuestas de error comparten la forma:

```json
{
  "detail": "Revisa los datos enviados.",
  "errors": {
    "monto": ["El monto debe ser mayor a 0."],
    "fecha": ["La fecha no puede ser futura."]
  }
}
```

> Para ver el mapeo de errores en la UI, crea un gasto con una **fecha futura**: esa regla vive solo en Django, y su error aparece bajo el input de fecha.

## Contrato tipado

```bash
# 1. Exportar el esquema desde Django
cd backend
python manage.py export_openapi_schema --api config.api.api --output openapi.json --indent 2

# 2. Regenerar los tipos TypeScript
cd ../frontend
npm run generate:types         # → src/lib/api-types.ts
```

Si cambia un schema en Django y no se regeneran los tipos, el job **"Contrato API ↔ tipos TS"** del CI falla. Si cambia el contrato y el frontend no se adapta, falla `tsc`.

## Tests

```bash
cd backend && pytest                                         # 16 tests: auth, CSRF, paginación, filtros, validaciones, permisos, resumen
cd frontend && npm run lint && npm run typecheck && npm run build
```

## Deploy (3rlabs)

**Recomendado:** servidor propio de 3R Labs con Docker y túnel de Cloudflare → [docs/SERVIDOR-3RLABS.md](docs/SERVIDOR-3RLABS.md).

Alternativa en Render + Vercel (guía completa: [docs/DEPLOY-3RLABS.md](docs/DEPLOY-3RLABS.md)):

| Pieza | Dónde | Dominio |
|---|---|---|
| Frontend | Vercel | `cuentasclaras.3rlabs.cl` |
| Backend + Postgres | Render (blueprint [`render.yaml`](render.yaml)) | `api.cuentasclaras.3rlabs.cl` |

**1. Backend (Render)**
- *New → Blueprint* y elige este repo: [`render.yaml`](render.yaml) crea la API (Docker, `backend/`) y la base Postgres, y genera `SECRET_KEY`.
- Cada deploy corre `migrate` y `seed`. `seed` solo reinicia la cuenta `demo`; los gastos de los demás usuarios no se tocan.
- *Settings → Custom Domains* → agrega `api.cuentasclaras.3rlabs.cl`.
- Si Render asigna otra URL `.onrender.com` (porque el nombre ya está tomado), actualiza `ALLOWED_HOSTS` y `CSRF_TRUSTED_ORIGINS` en el servicio.

**2. Frontend (Vercel)**
- Root directory: `frontend`
- Variable: `BACKEND_URL=https://api.cuentasclaras.3rlabs.cl` (se lee en el build para el proxy `/api/*`; si la cambias, vuelve a desplegar).
- *Settings → Domains* → agrega `cuentasclaras.3rlabs.cl`.

**3. DNS (zona de 3rlabs.cl)**
- `CNAME cuentasclaras → cname.vercel-dns.com` (Vercel muestra el valor exacto al agregar el dominio).
- `CNAME api.cuentasclaras → cuentas-claras-api.onrender.com`

> El plan gratuito de Render suspende el servicio tras 15 minutos sin uso (la primera petición tarda ~50 s) y su Postgres gratuito expira a los 30 días. Para uso diario, el blueprint usa planes pagados.

## Uso real (cuentas de la familia)

No hay registro abierto: las cuentas se crean desde el admin de Django. Cada usuario ve **solo sus propios gastos**.

```bash
# En Render: servicio cuentas-claras-api → Shell
python manage.py createsuperuser
```

Luego entra a `https://api.cuentasclaras.3rlabs.cl/admin/` y crea el resto de los usuarios en *Users → Add*. Cada uno inicia sesión en `cuentasclaras.3rlabs.cl` con su usuario y contraseña.

## Estructura

```
├── backend/
│   ├── config/            # settings, urls, NinjaAPI y manejo global de errores
│   └── gastos/
│       ├── models.py      # Gasto + Categoria
│       ├── schemas.py     # contrato de entrada/salida y validaciones
│       ├── api.py         # CRUD, listado paginado y resumen
│       ├── auth_api.py    # login, logout, me
│       ├── management/commands/seed.py
│       └── tests/
├── frontend/
│   └── src/
│       ├── app/           # /login, /dashboard, providers
│       ├── components/    # tabla, formulario, modales, resumen
│       ├── hooks/         # TanStack Query (queries, mutaciones optimistas), debounce
│       ├── lib/           # cliente API, tipos generados, schemas Zod
│       └── proxy.ts       # redirige a /login si no hay cookie de sesión
├── docker-compose.yml
└── .github/workflows/ci.yml
```
