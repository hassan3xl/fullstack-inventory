from dj_database_url import parse
import dj_database_url
import socket
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

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5000',        
    'http://localhost:3000',
    'https://dev.qstack.com.ng',    
    'https://api.qstack.com.ng',    
    'https://testing.qstack.com.ng',
]

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'api.qstack.com.ng',        # your backend tunnel
    'dev.qstack.com.ng',        # optional, if Django serves frontend too
    'testing.qstack.com.ng',    # any other tunnel subdomain hitting Django
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5000',
    'http://localhost:3000',
    'https://dev.qstack.com.ng',
    'https://api.qstack.com.ng',
    'https://testing.qstack.com.ng',
]

# Frontend configurations for testing environment
FRONTEND_URL = "https://testing.qstack.com.ng"
FRONTEND_DOMAIN = "testing.qstack.com.ng"
FRONTEND_PROTOCOL = "https"


# Use config values (SECRET_KEY from base is a default, override with env if needed)
SECRET_KEY = CONFIG_SECRET_KEY

db_url = (
    os.environ.get("TESTING_DB")
    or os.environ.get("DATABASE_URL")
    or os.environ.get("DOCKER_DB") # docker db inside docker venv
    or os.environ.get("LOCAL_DB") # docker db on localhost
    or os.environ.get("PRODUCTION_DB")  
    or os.environ.get("SQLITE_DB")
    or "sqlite:///db.sqlite3"
)

ssl_require = False
if db_url and "neon.tech" in db_url:
    ssl_require = True

DATABASES = {
    "default": dj_database_url.config(
        # default=db_url,
        default=os.environ.get("LOCAL_DB"),
        conn_max_age=0,
        # ssl_require=ssl_require,
    )
}

STORAGES = {
    # Media: Goes to Cloudinary
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    
    # Static: Stays local (or use WhiteNoise in production)
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}


# CACHES = {
#     "default": {
#         "BACKEND": "django_redis.cache.RedisCache",
#         "LOCATION": os.getenv("REDIS_URL", "redis://redis:6379/1"),
#         "OPTIONS": {
#             "CLIENT_CLASS": "django_redis.client.DefaultClient",
#         },
#     }
# }


SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.resend.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'resend'
# Try to get from environ, fallback to the one loaded by dotenv in config
EMAIL_HOST_PASSWORD = os.environ.get('RESEND_API_KEY', RESEND_API_KEY)
DEFAULT_FROM_EMAIL = 'Quantum Stack Inventory <noreply@mail.qstack.com.ng>'


# ruuning the testing server
# # WSGI (sync apps)
# DJANGO_SETTINGS_MODULE=src.settings.testing gunicorn src.wsgi:application \
#     --bind 0.0.0.0:5000 \
#     --workers 2 \
#     --reload

# # ASGI (async / channels / websockets)
# DJANGO_SETTINGS_MODULE=src.settings.testing gunicorn src.asgi:application \
#     -k uvicorn.workers.UvicornWorker \
#     --bind 0.0.0.0:5000 \
#     --workers 2 \
#     --reload