from dj_database_url import parse
import dj_database_url
import socket

from pytest import Cache
from .base import *
import os

DEBUG = True
hostname, _, ips = socket.gethostbyname_ex(socket.gethostname())
INTERNAL_IPS = [ip[:-1] + "1" for ip in ips] + ["127.0.0.1"]


# Load configuration from src.config
from src.config import (
    ALLOWED_ORIGINS, 
    ALLOWED_HOSTS, 
    SECRET_KEY as CONFIG_SECRET_KEY,
    PRODUCTION_DB,
    DEVELOPMENT_DB,
    RESEND_API_KEY
)

# Use config values (SECRET_KEY from base is a default, override with env if needed)
SECRET_KEY = CONFIG_SECRET_KEY
ALLOWED_HOSTS = ALLOWED_HOSTS
ALLOWED_ORIGINS = ALLOWED_ORIGINS
USE_REDIS_CACHE = os.getenv('USE_REDIS_CACHE')


db_url = (
    os.environ.get("DATABASE_URL")
    or os.environ.get("DOCKER_DB") # docker db inside docker venv
    or os.environ.get("LOCAL_DB") # docker db on localhost
    or os.environ.get("PRODUCTION_DB")  
    or os.environ.get("TESTING_DB")
    or "sqlite:///db.sqlite3"
)

ssl_require = False
if db_url and "neon.tech" in db_url:
    ssl_require = True

DATABASES = {
    "default": dj_database_url.config(
        # default=db_url,   
        default=os.environ.get("LOCAL_DB"),
        conn_max_age=600,
        ssl_require=ssl_require,
    )
}
    


if USE_REDIS_CACHE == True:  # Redis available (production/dev with Redis)
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/1"),
        }
    }
else:  # No Redis — fall back to in-memory (local dev / no Redis deploy)
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }

# Try to get Resend API key from environment, fallback to the one loaded by dotenv in config
RESEND_API_KEY_VAL = os.environ.get('RESEND_API_KEY') or (RESEND_API_KEY if 'RESEND_API_KEY' in globals() else None)

if RESEND_API_KEY_VAL and not RESEND_API_KEY_VAL.startswith("re_placeholder"):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:   
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

EMAIL_HOST = 'smtp.resend.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'resend'
EMAIL_HOST_PASSWORD = RESEND_API_KEY_VAL
DEFAULT_FROM_EMAIL = 'Quantum Stack Inventory <noreply@mail.qstack.com.ng>'