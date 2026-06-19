from django.db import models
from django.utils import timezone
import uuid

from .base import TenantBaseModel


class SubscriptionPlan(models.Model):
    """Global subscription plans. e.g. free, pro, business."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    price = models.PositiveIntegerField(default=0, help_text="Price in Naira")
    currency = models.CharField(max_length=8, default="NGN")
    
    # Specific limits and features
    max_products = models.IntegerField(default=-1, help_text="-1 represents unlimited products")
    max_staff = models.IntegerField(default=-1, help_text="-1 represents unlimited staff members")
    has_customers = models.BooleanField(default=False)
    has_analytics = models.BooleanField(default=False)

    features = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False, help_text="If true, tenants are assigned this plan by default (free tier)")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "subscription_plans"
        ordering = ["-is_default", "price", "name"]

    def __str__(self):
        return f"{self.name} ({self.slug})"


class TenantSubscription(TenantBaseModel):
    """Stores which plan a tenant is currently on."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="tenant_subscriptions")
    active = models.BooleanField(default=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    auto_renew = models.BooleanField(default=True)
    started_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_subscriptions"
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.tenant.name} → {self.plan.name} ({'active' if self.active else 'inactive'})"

    @property
    def is_expired(self):
        if self.ends_at:
            return timezone.now() > self.ends_at
        return False
