# Gastos — Next.js + Django API

[![CI](https://github.com/y-jeff/FullStack-Developer/actions/workflows/ci.yml/badge.svg)](https://github.com/y-jeff/FullStack-Developer/actions/workflows/ci.yml)

Registro de gastos personales con **arquitectura desacoplada**: un frontend en **Next.js 16 + TypeScript** que consume una **API REST en Django Ninja**, conectados por un contrato OpenAPI tipado de punta a punta.

| | |
|---|---|
| **Demo** | https://TU-APP.vercel.app — botón **"Entrar como demo"** |
| **API docs (Swagger)** | https://TU-API.onrender.com/api/docs |
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

## Deploy

**Backend (Render, Web Service con Docker)**
- Root directory: `backend`
- Variables: `SECRET_KEY`, `DATABASE_URL` (Postgres de Render o Neon), `ALLOWED_HOSTS=tu-api.onrender.com`, `CSRF_TRUSTED_ORIGINS=https://tu-app.vercel.app`
- Para que la demo se reinicie en cada deploy, usa este comando de inicio:
  `sh -c "python manage.py migrate --noinput && python manage.py seed && gunicorn config.wsgi --bind 0.0.0.0:$PORT"`

**Frontend (Vercel)**
- Root directory: `frontend`
- Variable: `BACKEND_URL=https://tu-api.onrender.com` (se usa en build para el proxy `/api/*`)

> El plan gratuito de Render suspende el servicio tras 15 minutos sin uso, y la primera petición tarda unos 50 segundos. Para una demo de portafolio conviene un plan pagado o un servicio que se mantenga activo.

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
