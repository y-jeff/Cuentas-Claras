# Cuentas Claras — Puesta en marcha en 3R Labs

Guía para dejar Cuentas Claras funcionando bajo el dominio `3rlabs.cl`: qué cuentas hacen falta, qué registros DNS crear, qué variables configurar y cómo comprobar que todo funciona.

- **Repositorio:** https://github.com/y-jeff/Cuentas-Claras (rama `main`)
- **Responsable:** y-jeff

---

## 1. Resumen

| Pieza | Servicio | Dominio final |
|---|---|---|
| Frontend (Next.js 16) | Vercel | `https://cuentasclaras.3rlabs.cl` |
| API (Django 5.2 + Django Ninja) | Render, Web Service con Docker | `https://api.cuentasclaras.3rlabs.cl` |
| Base de datos (PostgreSQL) | Render Postgres | privada; solo la usa la API |

```
Navegador ──► cuentasclaras.3rlabs.cl (Vercel)
                 └─ /api/*  ── proxy ──►  api.cuentasclaras.3rlabs.cl (Render) ──► Postgres (Render)
```

El navegador **solo habla con `cuentasclaras.3rlabs.cl`**. Next.js reenvía `/api/*` a la API, así que la cookie de sesión es del mismo dominio que la página: no hay CORS ni cookies de terceros que configurar.

`api.cuentasclaras.3rlabs.cl` se usa para tres cosas: el proxy del frontend, la documentación Swagger (`/api/docs`) y el panel de administración (`/admin/`).

---

## 2. Lo que se necesita antes de empezar

- [ ] Acceso a la zona DNS de `3rlabs.cl`, para crear dos registros CNAME.
- [ ] Una cuenta de **Render** con acceso al repo de GitHub `y-jeff/Cuentas-Claras`.
- [ ] Una cuenta de **Vercel** con acceso al mismo repo.
- [ ] Un medio de pago en Render (ver costos en la sección 9).

No hay secretos que traspasar: Render genera `SECRET_KEY` y `DATABASE_URL` por su cuenta.

---

## 3. Paso 1 — API y base de datos en Render

El repo trae un blueprint ([`render.yaml`](../render.yaml)) que crea todo de una vez.

1. Render → **New → Blueprint** → elige el repo `y-jeff/Cuentas-Claras`, rama `main`.
2. Render muestra dos recursos. Confírmalos:
   - `cuentas-claras-api`: Web Service con Docker, carpeta `backend/`, plan `starter`.
   - `cuentas-claras-db`: PostgreSQL, plan `basic-256mb`.
3. Espera a que termine el primer deploy. En cada deploy, el servicio:
   1. aplica las migraciones (`migrate`);
   2. reinicia la cuenta demo (`seed`), **que solo toca al usuario `demo`**;
   3. levanta Gunicorn.
4. Anota la URL que asignó Render, normalmente `https://cuentas-claras-api.onrender.com`. Si el nombre estaba tomado, Render agrega un sufijo (ej. `cuentas-claras-api-x1y2.onrender.com`). En ese caso:
   - en *Environment*, corrige `ALLOWED_HOSTS` y `CSRF_TRUSTED_ORIGINS` con la URL real;
   - usa esa URL en el CNAME del paso 3.

### Variables de entorno de la API

El blueprint ya las deja configuradas. Se listan aquí como referencia:

| Variable | Valor | Para qué sirve |
|---|---|---|
| `DEBUG` | `false` | Modo producción: cookies `Secure`, sin páginas de error con detalle. |
| `SECRET_KEY` | *(la genera Render)* | Firma sesiones y CSRF. No compartirla. |
| `DATABASE_URL` | *(la conecta Render desde `cuentas-claras-db`)* | Conexión a Postgres. |
| `ALLOWED_HOSTS` | `api.cuentasclaras.3rlabs.cl,cuentas-claras-api.onrender.com` | Dominios que la API acepta. |
| `CSRF_TRUSTED_ORIGINS` | `https://cuentasclaras.3rlabs.cl,https://api.cuentasclaras.3rlabs.cl,https://cuentas-claras-api.onrender.com` | Orígenes que pueden enviar `POST/PUT/DELETE`. El del frontend es obligatorio; el de la API permite usar `/admin/`. |

### Dominio propio de la API

5. En el servicio `cuentas-claras-api` → **Settings → Custom Domains** → **Add** → `api.cuentasclaras.3rlabs.cl`.
6. Render indica el CNAME que debe apuntar al servicio. Créalo en el paso 3 y vuelve aquí a pulsar **Verify**. Render emite el certificado HTTPS solo.

---

## 4. Paso 2 — Frontend en Vercel

1. Vercel → **Add New → Project** → importa `y-jeff/Cuentas-Claras`.
2. **Root Directory:** `frontend`. Framework: Next.js, que Vercel detecta solo.
3. **Environment Variables** (en Production):

   | Variable | Valor |
   |---|---|
   | `BACKEND_URL` | `https://api.cuentasclaras.3rlabs.cl` |

   > `BACKEND_URL` se lee **durante el build**, no en tiempo de ejecución. Si se cambia, hay que hacer **Redeploy**.
   >
   > Si el dominio de la API todavía no tiene certificado, se puede usar temporalmente la URL `*.onrender.com`. Después hay que cambiarla y volver a desplegar.

4. **Deploy.**
5. **Settings → Domains** → agrega `cuentasclaras.3rlabs.cl`. Vercel muestra el CNAME exacto que corresponde.

---

## 5. Paso 3 — Registros DNS en `3rlabs.cl`

| Tipo | Nombre | Destino | Para |
|---|---|---|---|
| `CNAME` | `cuentasclaras` | `cname.vercel-dns.com` (o el valor exacto que indique Vercel) | Frontend |
| `CNAME` | `api.cuentasclaras` | `cuentas-claras-api.onrender.com` (o la URL real del paso 1) | API |

- Si el proveedor DNS usa proxy, por ejemplo Cloudflare con la nube naranja, déjalo **en modo "DNS only"** para ambos registros. Así Vercel y Render pueden emitir sus certificados.
- La propagación suele tardar minutos, pero puede llegar a algunas horas.
- Una vez propagado, verifica el dominio en Vercel y en Render.

---

## 6. Paso 4 — Comprobar que funciona

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Abrir `https://api.cuentasclaras.3rlabs.cl/api/docs` | Se ve Swagger con el título **"Cuentas Claras API"**. |
| 2 | Abrir `https://cuentasclaras.3rlabs.cl` | Redirige a `/login` y muestra "Cuentas Claras". |
| 3 | Pulsar **"Entrar como demo"** | Entra al dashboard con unos 80 gastos de ejemplo. |
| 4 | Crear, editar y eliminar un gasto | Los cambios se guardan y siguen ahí al recargar. |
| 5 | Crear un gasto con **fecha futura** | Aparece un error bajo el campo fecha (lo valida la API). |
| 6 | Cerrar sesión | Vuelve a `/login`; `/dashboard` ya no se puede abrir. |
| 7 | Abrir `https://api.cuentasclaras.3rlabs.cl/admin/` | Se ve el login del admin de Django, con estilos. |

Desde una terminal:

```bash
curl -I https://api.cuentasclaras.3rlabs.cl/api/docs          # 200
curl -i https://cuentasclaras.3rlabs.cl/api/auth/me            # 401 (sin sesión): el proxy llega a la API
```

---

## 7. Paso 5 — Cuentas para uso real

No hay registro abierto: las cuentas las crea un administrador. Cada usuario ve **solo sus propios gastos**.

1. Render → `cuentas-claras-api` → **Shell**:
   ```bash
   python manage.py createsuperuser
   ```
2. Entrar a `https://api.cuentasclaras.3rlabs.cl/admin/` con ese usuario.
3. **Users → Add user**: usuario y contraseña de cada persona (mínimo 8 caracteres). Opcionalmente, completar el *First name*, que es el nombre que aparece en el header de la app.
4. Cada persona entra en `https://cuentasclaras.3rlabs.cl` con sus datos. La sesión dura 8 horas.

> La cuenta `demo` / `demo1234` es pública: está pensada para el portafolio, y sus datos se reinician en cada deploy. No guardar datos reales en ella.

---

## 8. Operación diaria

| Tarea | Cómo |
|---|---|
| **Publicar cambios** | `git push` a `main`. Render y Vercel despliegan solos; el CI de GitHub Actions corre los tests. |
| **Ver logs de la API** | Render → `cuentas-claras-api` → **Logs**. |
| **Ver logs del frontend** | Vercel → proyecto → **Logs**. |
| **Respaldo manual de la base** | Copia la *External Database URL* desde Render → `cuentas-claras-db` → Connect, y luego: `pg_dump "<External Database URL>" > respaldo-$(date +%F).sql` |
| **Respaldos automáticos** | Revisa en Render → `cuentas-claras-db` qué respaldos incluye el plan contratado. |
| **Cambiar una contraseña** | `/admin/` → Users → usuario → opción para cambiar la contraseña, junto al campo *Password*. |
| **Rotar `SECRET_KEY`** | Render → Environment → generar un valor nuevo. Cierra todas las sesiones abiertas. |

---

## 9. Costos estimados

| Recurso | Plan | Costo aprox. |
|---|---|---|
| Frontend | Vercel Hobby | US$0 (solo uso **no comercial**; si 3R Labs cobra por la app → Vercel Pro) |
| API | Render `starter` | ~US$7/mes |
| Base de datos | Render Postgres `basic-256mb` | ~US$6/mes |

> **No usar los planes gratuitos de Render para uso real.** La API gratuita se suspende tras 15 minutos sin uso, y la primera petición tarda unos 50 s. El Postgres gratuito **expira a los 30 días** y se pierden los datos.
>
> Los planes y precios son los del blueprint; confírmalos en Render al momento de crearlo.

---

## 10. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `400 Bad Request` en toda la API | El dominio no está en `ALLOWED_HOSTS`. | Agregar el dominio exacto, sin `https://`, y redeploy. |
| `403` al iniciar sesión o al guardar | El origen del frontend no está en `CSRF_TRUSTED_ORIGINS`. | Debe estar `https://cuentasclaras.3rlabs.cl`, con `https://` y sin `/` al final. |
| `403 CSRF` al entrar a `/admin/` | Falta el origen de la API en `CSRF_TRUSTED_ORIGINS`. | Agregar `https://api.cuentasclaras.3rlabs.cl`. |
| El frontend carga, pero el login falla con error de red o 5xx | `BACKEND_URL` es incorrecta o se cambió sin redeploy. | Corregirla en Vercel y hacer **Redeploy**. |
| Se inicia sesión, pero al recargar vuelve a `/login` | Se está entrando por `http://` en vez de `https://` (las cookies son `Secure`). | Usar siempre `https://`. |
| Render marca el deploy como fallido por el *health check* | El chequeo llega con un dominio que no está en `ALLOWED_HOSTS`. | Revisar los logs (`DisallowedHost`) y agregar ese dominio, o quitar `healthCheckPath` de `render.yaml`. |
| El dominio no obtiene certificado | El CNAME no está propagado o el registro pasa por un proxy. | Revisar el registro con `nslookup` y dejarlo en "DNS only". |
| `/admin/` se ve sin estilos | Falló `collectstatic` en el build de Docker. | Revisar los logs de build en Render. |

---

## 11. Checklist final

- [ ] Blueprint creado en Render; la API y Postgres quedan en estado *Live*.
- [ ] Dominio `api.cuentasclaras.3rlabs.cl` verificado en Render, con HTTPS.
- [ ] Proyecto en Vercel con root `frontend` y `BACKEND_URL=https://api.cuentasclaras.3rlabs.cl`.
- [ ] Dominio `cuentasclaras.3rlabs.cl` verificado en Vercel, con HTTPS.
- [ ] Registros CNAME `cuentasclaras` y `api.cuentasclaras` creados.
- [ ] Las 7 pruebas de la sección 6 pasan.
- [ ] Superusuario creado y cuentas de la familia dadas de alta.
- [ ] Primer respaldo manual de la base hecho.
