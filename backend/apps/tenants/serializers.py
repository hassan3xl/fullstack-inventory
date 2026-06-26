from rest_framework import serializers
from .models import Tenant
from .models import SubscriptionPlan, TenantSubscription

class TenantSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = ['id', 'name', 'business_type', 'logo', 'is_active', 'created_at']

    def get_logo(self, obj):
        if obj.logo:
            return obj.logo.url
        return None

class TenantDashboardSerializer(serializers.Serializer):
    total_products = serializers.IntegerField(default=0)
    total_staff = serializers.IntegerField(default=0)
    business_name = serializers.CharField()
    business_type = serializers.CharField()


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'slug', 'name', 'price', 'currency', 'max_products', 'max_staff', 'has_customers', 'has_analytics', 'features', 'is_active', 'is_default'
        ]


class TenantSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model = TenantSubscription
        fields = [
            'id', 'plan', 'active', 'stripe_subscription_id', 'auto_renew', 'started_at', 'ends_at'
        ]
