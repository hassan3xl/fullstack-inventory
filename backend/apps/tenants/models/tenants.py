from django.db import models
from django.utils import timezone
import uuid
from cloudinary.models import CloudinaryField

class Tenant(models.Model):
    class BusinessType(models.TextChoices):
        PHARMACY = 'pharmacy', 'Pharmacy & Medicine'
        ELECTRONICS = 'electronics', 'Electronics & Gadgets'
        CLOTHING = 'clothing', 'Clothing & Apparel'
        GENERAL = 'general', 'General Retail'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_id = models.CharField(max_length=64, unique=True, blank=True, null=True)
    parent_enterprise_tenant = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_premium_stores'
    )
    name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=50, choices=BusinessType.choices, default=BusinessType.GENERAL)
    logo = CloudinaryField('image', folder='logos/', blank=True, null=True)
    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending Check'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    subdomain = models.CharField(max_length=64, unique=True, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    )
    is_active = models.BooleanField(default=True)
    email_notifications_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def principal_user(self):
        owner_rel = self.users.filter(role='owner').first()
        if not owner_rel:
            owner_rel = self.users.filter(role='admin').first()
        return owner_rel.user if owner_rel else None

    @property
    def is_pending(self):
        return self.status == self.StatusChoices.PENDING

    @property
    def current_plan(self):
        from apps.tenants.models.subscriptions import TenantSubscription
        target_tenant = self.parent_enterprise_tenant if self.parent_enterprise_tenant else self
        sub = TenantSubscription.plain_objects.filter(tenant=target_tenant, active=True).first()
        return sub.plan if sub else None

    class Meta:
        db_table = "tenants"

    def save(self, *args, **kwargs):
        if not self.store_id:
            import random
            import string
            while True:
                new_id = "STORE-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
                if not Tenant.objects.filter(store_id=new_id).exists():
                    self.store_id = new_id
                    break
        
        if self.subdomain:
            self.subdomain = self.subdomain.lower().strip()
        else:
            self.subdomain = None

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class TenantUser(models.Model):
    """
    Links a platform User to a specific Tenant and assigns their in-store role.

    Store-level roles (lowest → highest authority):
        STAFF    — basic read/write on own tasks
        CASHIER  — can process sales / view pricing
        MANAGER  — can manage stock, staff tasks, and reports
        ADMIN    — full control of the store (invite staff, change settings)
        OWNER    — same as admin + can delete the store / transfer ownership
                   (typically the user whose User.role == TENANT)
    """

    class Role(models.TextChoices):
        OWNER   = 'owner',   'Owner'
        ADMIN   = 'admin',   'Administrator'
        MANAGER = 'manager', 'Manager'
        CASHIER = 'cashier', 'Cashier'

    # Maps role → numeric rank so you can compare authority with >=
    ROLE_RANK = {
        Role.OWNER:   50,
        Role.ADMIN:   40,
        Role.MANAGER: 30,
        Role.CASHIER: 20,
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='users')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='tenant_roles')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CASHIER)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tenant_users"
        unique_together = ('tenant', 'user')

    def __str__(self):
        return f"{self.user} — {self.tenant.name} ({self.get_role_display()})"

    def has_role_at_least(self, minimum_role: str) -> bool:
        """Check if this user's role is >= minimum_role in authority."""
        return self.ROLE_RANK.get(self.role, 0) >= self.ROLE_RANK.get(minimum_role, 0)

