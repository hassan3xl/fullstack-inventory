from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
import os
import sys
import threading
import time
import requests

from apps.products import views


def health_check(request):
    return JsonResponse({
        "status": "ok",
        "message": "Backend service is available.",
    })


def ping_self():
    # Wait for Django to start up completely before sending the first request
    time.sleep(15)
    
    url = os.environ.get("RENDER_EXTERNAL_URL") or "https://qstack-inventory-backend.onrender.com"
    if not url.endswith('/'):
        url += '/'
    ping_url = f"{url}ping/"
    
    print(f"[Keep-Alive] Starting background ping worker for: {ping_url}")
    while True:
        try:
            response = requests.get(ping_url, timeout=30)
            print(f"[Keep-Alive] Pinged {ping_url} - Status Code: {response.status_code}")
        except Exception as e:
            print(f"[Keep-Alive] Error pinging {ping_url}: {e}")
        time.sleep(300)  # Sleep for 5 minutes (300 seconds)

def should_start_ping():
    # Prevent running during test execution (pytest, django tests, etc.)
    if 'test' in sys.argv or 'pytest' in sys.modules or 'pytest' in sys.argv[0]:
        return False
    # If running with django runserver, only start in the main worker process, not the reloader parent process
    if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
        return False
    return True

if should_start_ping():
    threading.Thread(target=ping_self, daemon=True).start()

urlpatterns = [
    # ping the backend to check if it's alive every 5 minutes
    # path('ping/', ping_self, name='ping'),
    path('api/health/', health_check, name='api-health'),
    path('admin/', admin.site.urls),
    path('api/', include('api.router.urls')),

    # Platform Admin (HTML views)
    path('', include('admin_panel.urls')),
]

