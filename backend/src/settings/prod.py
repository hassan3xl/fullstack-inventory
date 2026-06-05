from .base import *
import os
import dj_database_url
from dotenv import load_dotenv
from src.config import (
    SECRET_KEY,
    ALLOWED_HOSTS,
    CORS_ALLOWED_ORIGINS,
    RESEND_API_KEY
)

load_dotenv()


SECRET_KEY = SECRET_KEY
DEBUG = True
ALLOWED_HOSTS = ALLOWED_HOSTS
CORS_ALLOWED_ORIGINS=CORS_ALLOWED_ORIGINS

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("PRODUCTION_DB"),
        conn_max_age=0,
        ssl_require=True,
    )
}

# Free-tier friendly cache
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'DEBUG',  # captures every request + errors
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',  # set to DEBUG to see every SQL query
            'propagate': False,
        },
    },
}


SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True


EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.resend.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'resend'
# Try to get from environ, fallback to the one loaded by dotenv in config
EMAIL_HOST_PASSWORD = os.environ.get('RESEND_API_KEY', RESEND_API_KEY)
DEFAULT_FROM_EMAIL = 'Quantum Stack Inventory <noreply@mail.qstack.com.ng>'