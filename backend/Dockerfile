FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# collectstatic necesita una SECRET_KEY, pero no la real.
RUN SECRET_KEY=build-only python manage.py collectstatic --noinput

EXPOSE 8000

# Render (y la mayoría de PaaS) inyectan PORT; en local se usa 8000.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi --bind 0.0.0.0:${PORT:-8000} --workers 2 --access-logfile -"]
