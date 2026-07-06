
from django.db import models
import uuid 
from cloudinary.models import CloudinaryField
from .categories import Category



# pyrefly: ignore [missing-import]
from apps.tenants.models import TenantBaseModel


class Product(TenantBaseModel):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="products")
    stock = models.PositiveIntegerField(default=0, help_text="Total stock across all batches")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    pack_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Optional bulk selling price for a whole pack. If blank, defaults to unit_price * units_per_pack.")
    base_unit = models.CharField(max_length=50, default='Piece', help_text="The smallest unit sold, e.g., Piece, Bottle, Single")
    pack_unit = models.CharField(max_length=50, default='Box', help_text="The stocking/purchase packaging unit, e.g., Crate, Dozen, Carton, Box")
    units_per_pack = models.PositiveIntegerField(default=1, help_text="Number of base units in one pack (e.g., 12 for dozen, 24 for crate)")
    variants = models.JSONField(default=list, blank=True, null=True, help_text="Available variants/colors")
    capacities = models.JSONField(default=list, blank=True, null=True, help_text="Available capacities and prices e.g. [{name:'1L', price:500}]")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Status
    is_active = models.BooleanField(default=True)
    image = CloudinaryField('image', folder='products/', blank=True, null=True)

    @property
    def stock_in_packs(self):
        if self.units_per_pack and self.units_per_pack > 1:
            return self.stock // self.units_per_pack
        return 0

    @property
    def stock_loose(self):
        if self.units_per_pack and self.units_per_pack > 1:
            return self.stock % self.units_per_pack
        return self.stock
    
    # Summary Inventory Dates (Aggregated from latest/earliest batch)
    production_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True, help_text="Earliest expiry date among active batches")
    best_before_days = models.PositiveIntegerField(null=True, blank=True)
    predicted_expiry_date = models.DateField(null=True, blank=True) # Set by AI
    is_ai_flagged = models.BooleanField(default=False) # AI flags for imminent expiry
    
    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'category', '-created_at']),
            models.Index(fields=['tenant', '-created_at']),
        ]

    @property
    def primary_image_url(self):
        return self.image.url if self.image else ""

    @property
    def is_expired(self):
        from django.utils import timezone
        if self.expiry_date:
            return self.expiry_date < timezone.now().date()
        return False

    def update_stock_from_batches(self):
        """
        Updates product total stock and earliest expiry date from its batches.
        """
        from django.utils import timezone
        now = timezone.now().date()

        # All batches with remaining quantity
        all_batches = self.batches.filter(quantity__gt=0)

        # Active (non-expired) batches
        active_batches = all_batches.filter(
            models.Q(expiry_date__isnull=True) | models.Q(expiry_date__gte=now)
        )
        
        # Calculate total stock of non-expired batches
        total_stock = active_batches.aggregate(models.Sum('quantity'))['quantity__sum'] or 0
        self.stock = total_stock
        
        # Find earliest expiry date (FEFO - First Expired First Out) among active ones first
        earliest_batch = active_batches.filter(expiry_date__isnull=False).order_by('expiry_date').first()
        if not earliest_batch:
            # Fallback to expired batches if no active batches are left
            earliest_batch = all_batches.filter(expiry_date__isnull=False).order_by('expiry_date').first()

        if earliest_batch:
            self.expiry_date = earliest_batch.expiry_date
            self.production_date = earliest_batch.production_date
        else:
            self.expiry_date = None
            self.production_date = None
            
        # Determine if expired
        is_expired = self.expiry_date and self.expiry_date < now
        
        # Auto-deactivate if expired and no active stock, reactivate if active stock exists
        if is_expired and total_stock == 0:
            self.is_active = False
        elif total_stock > 0:
            self.is_active = True
            
        # Update without recursion
        Product.objects.filter(id=self.id).update(
            stock=self.stock,
            expiry_date=self.expiry_date,
            production_date=self.production_date,
            is_active=self.is_active
        )

    def save(self, *args, **kwargs):
        from datetime import timedelta
        
        # 1. Inherit default best before days from category if not set
        if not self.best_before_days and self.category and self.category.default_best_before_days:
            self.best_before_days = self.category.default_best_before_days

        # 2. Automatically calculate expiry date if production date and best before days are available
        if self.production_date and self.best_before_days and not self.expiry_date:
            self.expiry_date = self.production_date + timedelta(days=self.best_before_days)
        
        self.full_clean() # Ensure validation runs before saving
        super().save(*args, **kwargs)


class StockBatch(TenantBaseModel):
    """
    Handles multiple arrivals of the same product with different expiry dates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="batches")
    batch_number = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=0)
    initial_quantity = models.PositiveIntegerField(default=0)
    
    production_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    @property
    def quantity_in_packs(self):
        if self.product.units_per_pack and self.product.units_per_pack > 1:
            return self.quantity // self.product.units_per_pack
        return 0

    @property
    def quantity_loose(self):
        if self.product.units_per_pack and self.product.units_per_pack > 1:
            return self.quantity % self.product.units_per_pack
        return self.quantity
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['expiry_date']
        verbose_name_plural = "Stock Batches"
        indexes = [
            models.Index(fields=['tenant', 'product']),
            models.Index(fields=['tenant', 'expiry_date']),
        ]

    def __str__(self):
        return f"{self.product.name} - #{self.batch_number} ({self.quantity} units)"

    def is_expired(self):
        from django.utils import timezone
        if self.expiry_date:
            return self.expiry_date < timezone.now().date()
        return False

    def save(self, *args, **kwargs):
        # Auto-calculate expiry if missing but category defaults exist
        if not self.expiry_date and self.production_date and self.product.category.default_best_before_days:
            from datetime import timedelta
            self.expiry_date = self.production_date + timedelta(days=self.product.category.default_best_before_days)
        
        super().save(*args, **kwargs)
        # Update product totals after batch change
        self.product.update_stock_from_batches()

    def delete(self, *args, **kwargs):
        product = self.product
        super().delete(*args, **kwargs)
        product.update_stock_from_batches()


class ProductInventory(TenantBaseModel):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='inventory')
    sku = models.CharField(max_length=100, unique=False, blank=True)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    track_inventory = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Product Inventories"
        indexes = [
            models.Index(fields=['tenant', 'product']),
        ]

    @property
    def is_in_stock(self):
        if not self.track_inventory:
            return True
        return self.product.stock > 0

    @property
    def is_low_stock(self):
        if not self.track_inventory:
            return False
        return 0 < self.product.stock <= self.low_stock_threshold

    def __str__(self):
        return f"{self.product.name} - Stock: {self.product.stock}"
