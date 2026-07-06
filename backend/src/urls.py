from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
import os
import sys
import threading
import time
import requests
from django.core.cache import cache
# pyrefly: ignore [missing-import]
from apps.products import views


HEALTH_CACHE_KEY = "qstack_health_check"
HEALTH_CACHE_TTL = 120 

def health_check(request):
    cached = cache.get(HEALTH_CACHE_KEY)

    if cached is not None:
        data = cached
    else:
        data = {
            "status": "ok",
            "service": "qstack-inventory",
            "message": "Backend service is available.",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        cache.set(HEALTH_CACHE_KEY, data, timeout=HEALTH_CACHE_TTL)

    response = JsonResponse(data)
    response['Cache-Control'] = 'public, max-age=120'
    return response


urlpatterns = [
    path('api/health/', health_check, name='health'),
    path('admin/', admin.site.urls),
    path('api/', include('api.router.urls')),

    # Platform Admin (HTML views)
    path('', include('admin_panel.urls')),
]

