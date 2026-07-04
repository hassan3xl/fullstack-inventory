from django.db import models
from utils.tenant_context import get_current_tenant

class TenantQuerySet(models.QuerySet):
    def filter_by_tenant(self):
        tenant = get_current_tenant()
        queryset = self
        # Exclude soft-deleted rows if the model has a deleted field
        if hasattr(self.model, 'deleted'):
            queryset = queryset.filter(deleted=False)
        if tenant:
            return queryset.filter(tenant=tenant)
        return queryset

class TenantManager(models.Manager):
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db).filter_by_tenant()

class TenantBaseModel(models.Model):
    tenant = models.ForeignKey(
        'tenants.Tenant', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        db_index=True
    )
    deleted = models.BooleanField(default=False, db_index=True)

    objects = TenantManager()
    plain_objects = models.Manager() # For cases where we need all records (e.g. platform admin, sync delta)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.tenant_id:
            tenant = get_current_tenant()
            if tenant:
                self.tenant = tenant
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Soft delete by marking deleted=True"""
        self.deleted = True
        self.save(update_fields=['deleted'])

