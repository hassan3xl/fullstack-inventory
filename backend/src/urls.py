    
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.router.urls')),

    # Platform Admin (HTML views)
    path('', include('admin_panel.urls')),
]
