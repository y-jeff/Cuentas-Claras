import os

# Los tests corren con SQLite salvo que DATABASE_URL apunte a otra base (en CI se usa Postgres).
os.environ.setdefault("DEBUG", "true")

from config.settings import *  # noqa: E402,F403

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
