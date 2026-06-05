from .models import Tenant, TenantUser
from django.contrib import admin

admin.site.register(TenantUser)


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active"]
