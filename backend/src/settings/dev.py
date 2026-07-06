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
    ALLOWED_HOSTS as CONFIG_HOSTS, 
    SECRET_KEY as CONFIG_SECRET_KEY,
    RESEND_API_KEY
)

# Use config values (SECRET_KEY from base is a default, override with env if needed)
SECRET_KEY = CONFIG_SECRET_KEY
ALLOWED_HOSTS = list(CONFIG_HOSTS)
for host in ["localhost", "127.0.0.1", "0.0.0.0"]:
    if host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(host)
        
ALLOWED_ORIGINS = ALLOWED_ORIGINS
USE_REDIS_CACHE = os.getenv('USE_REDIS_CACHE')


db_url = (
    os.environ.get("LOCAL_DB")
    or os.environ.get("TESTING_DB")
    or "sqlite:///db.sqlite3"
)

ssl_require = False
if db_url and "neon.tech" in db_url:
    ssl_require = True

DATABASES = {
    "default": dj_database_url.config(
        default=db_url,   
        conn_max_age=600,
        ssl_require=ssl_require,
    )
}
    


# Smart Redis caching with local fallback
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

USE_REDIS_CACHE_ENV = os.getenv('USE_REDIS_CACHE', 'False').lower() in ('true', '1', 'yes')
redis_url = os.environ.get("REDIS_URL")

if USE_REDIS_CACHE_ENV or redis_url:
    import redis
    test_url = redis_url or "redis://127.0.0.1:6379/1"
    try:
        # Quick ping check (timeout 1.0s to avoid blocking server boot)
        client = redis.from_url(test_url, socket_timeout=1.0)
        client.ping()
        CACHES = {
            "default": {
                "BACKEND": "django.core.cache.backends.redis.RedisCache",
                "LOCATION": test_url,
            }
        }
        print(f"[Cache] Connected to Redis at {test_url}. Using RedisCache.")
    except Exception as e:
        print(f"[Cache] Redis check failed ({e}). Falling back to LocMemCache.")

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