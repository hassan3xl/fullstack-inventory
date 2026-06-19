from .models import Tenant, TenantUser, SubscriptionPlan, TenantSubscription
from django.contrib import admin

admin.site.register(TenantUser)
admin.site.register(SubscriptionPlan)
admin.site.register(TenantSubscription)


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active", "active_plan"]

    def active_plan(self, obj):
        # Look up active subscription
        sub = TenantSubscription.plain_objects.filter(tenant=obj, active=True).select_related('plan').first()
        return sub.plan.name if sub and sub.plan else "Free"

    active_plan.short_description = "Active Plan"
