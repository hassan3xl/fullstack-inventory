from rest_framework import serializers
from .models import Tenant
from .models import SubscriptionPlan, TenantSubscription

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'slug', 'name', 'price', 'currency', 'max_products', 'max_staff',
            'has_customers', 'has_analytics', 'has_ai_integration', 'has_advanced_reporting',
            'has_priority_support', 'has_subdomain', 'features', 'is_active', 'is_default'
        ]


class TenantSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()
    current_plan = SubscriptionPlanSerializer(read_only=True)
    linked_premium_stores = serializers.SerializerMethodField()
    parent_enterprise_tenant = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'store_id', 'name', 'business_type', 'logo', 'is_active',
            'email_notifications_enabled', 'created_at', 'current_plan',
            'parent_enterprise_tenant', 'linked_premium_stores', 'subdomain'
        ]

    def validate_subdomain(self, value):
        if not value:
            return None
        
        tenant = self.instance
        if tenant:
            plan = tenant.current_plan
            if not plan or not plan.has_subdomain:
                raise serializers.ValidationError("Your subscription plan does not support custom subdomains. Please upgrade to an Enterprise plan.")
        
        import re
        if not re.match(r'^[a-z0-9-]+$', value):
            raise serializers.ValidationError("Subdomain can only contain lowercase letters, numbers, and hyphens.")
        
        existing = Tenant.objects.filter(subdomain=value)
        if tenant:
            existing = existing.exclude(id=tenant.id)
        if existing.exists():
            raise serializers.ValidationError("This subdomain is already taken.")
            
        return value

    def get_logo(self, obj):
        if obj.logo:
            return obj.logo.url
        return None

    def get_linked_premium_stores(self, obj):
        return [
            {
                "id": store.id,
                "name": store.name,
                "store_id": store.store_id,
            }
            for store in obj.linked_premium_stores.all()
        ]

    def get_parent_enterprise_tenant(self, obj):
        if obj.parent_enterprise_tenant:
            return {
                "id": obj.parent_enterprise_tenant.id,
                "name": obj.parent_enterprise_tenant.name,
                "store_id": obj.parent_enterprise_tenant.store_id,
            }
        return None

class TenantDashboardSerializer(serializers.Serializer):
    total_products = serializers.IntegerField(default=0)
    total_staff = serializers.IntegerField(default=0)
    business_name = serializers.CharField()
    business_type = serializers.CharField()


class TenantSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model = TenantSubscription
        fields = [
            'id', 'plan', 'active', 'stripe_subscription_id',
            'paystack_subscription_code', 'paystack_customer_code',
            'paystack_payment_reference', 'payment_provider', 'payment_status',
            'auto_renew', 'started_at', 'ends_at'
        ]
