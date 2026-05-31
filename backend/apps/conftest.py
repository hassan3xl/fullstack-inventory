import pytest
from datetime import date, timedelta
from unittest.mock import patch
from django.contrib.auth import get_user_model

User = get_user_model()


# ─────────────────────────────────────────────
#  TENANT FIXTURE
#  Your models extend TenantBaseModel so every
#  object needs a tenant attached to it.
#  Adjust the import path to match your project.
# ─────────────────────────────────────────────
@pytest.fixture
def tenant(db):
    from apps.tenants.models import Tenant   # adjust import if needed
    return Tenant.objects.create(
        name="Test Business",
        business_type="grocery",
    )


# ─────────────────────────────────────────────
#  USER & AUTH
# ─────────────────────────────────────────────
@pytest.fixture
def user(db, tenant):
    return User.objects.create_user(
        username="testuser",
        password="pass123",
        email="test@example.com",
    )


@pytest.fixture
def auth_client(client, user):
    client.force_login(user)
    return client


# ─────────────────────────────────────────────
#  CATEGORY
# ─────────────────────────────────────────────
@pytest.fixture
def category(db, tenant):
    from apps.products.categories import Category   # adjust import if needed
    return Category.objects.create(
        tenant=tenant,
        name="Beverages",
        business_type="grocery",
        expiry_strategy="STABLE",
        default_best_before_days=365,
    )


@pytest.fixture
def category_no_expiry(db, tenant):
    """A category with no default best_before_days (electronics, clothing etc.)"""
    from apps.products.categories import Category
    return Category.objects.create(
        tenant=tenant,
        name="Electronics",
        business_type="electronics",
        expiry_strategy="GENERAL",
        default_best_before_days=0,
    )


# ─────────────────────────────────────────────
#  PRODUCT
# ─────────────────────────────────────────────
@pytest.fixture
def product(db, tenant, category):
    """
    A basic active product with no batch data yet.
    Cloudinary is mocked so no real HTTP calls are made.
    """
    from apps.products.models import Product
    return Product.objects.create(
        tenant=tenant,
        name="Coca Cola 1L",
        description="A refreshing drink",
        category=category,
        unit_price="500.00",
        stock=0,
        is_active=True,
    )


@pytest.fixture
def product_with_expiry(db, tenant, category):
    """Product that already has a production date set."""
    from apps.products.models import Product
    return Product.objects.create(
        tenant=tenant,
        name="Milk 1L",
        category=category,
        unit_price="300.00",
        stock=0,
        production_date=date.today(),
        best_before_days=14,
    )


@pytest.fixture
def expired_product(db, tenant, category):
    """Product whose expiry date is already in the past."""
    from apps.products.models import Product
    p = Product.objects.create(
        tenant=tenant,
        name="Old Yoghurt",
        category=category,
        unit_price="200.00",
        stock=10,
    )
    # bypass save() logic and set expiry directly
    Product.objects.filter(id=p.id).update(
        expiry_date=date.today() - timedelta(days=1)
    )
    p.refresh_from_db()
    return p


# ─────────────────────────────────────────────
#  STOCK BATCH
# ─────────────────────────────────────────────
@pytest.fixture
def stock_batch(db, product):
    """A fresh batch with 50 units, expires in 30 days."""
    from apps.products.models import StockBatch
    return StockBatch.objects.create(
        tenant=product.tenant,
        product=product,
        batch_number="BATCH-001",
        quantity=50,
        initial_quantity=50,
        production_date=date.today(),
        expiry_date=date.today() + timedelta(days=30),
    )


@pytest.fixture
def expired_batch(db, product):
    """A batch that has already expired."""
    from apps.products.models import StockBatch
    return StockBatch.objects.create(
        tenant=product.tenant,
        product=product,
        batch_number="BATCH-EXP",
        quantity=20,
        initial_quantity=20,
        production_date=date.today() - timedelta(days=60),
        expiry_date=date.today() - timedelta(days=1),
    )


# ─────────────────────────────────────────────
#  PRODUCT INVENTORY
# ─────────────────────────────────────────────
@pytest.fixture
def inventory(db, product):
    from apps.products.models import ProductInventory
    return ProductInventory.objects.create(
        tenant=product.tenant,
        product=product,
        sku="SKU-001",
        low_stock_threshold=5,
        track_inventory=True,
    )


# ─────────────────────────────────────────────
#  CLOUDINARY MOCK
#  Prevents any real image uploads during tests.
#  Use this fixture on any test that touches
#  ProductImage or any CloudinaryField.
# ─────────────────────────────────────────────
@pytest.fixture
def mock_cloudinary():
    """Patches Cloudinary so no real uploads happen."""
    with patch("cloudinary.uploader.upload") as mock_upload:
        mock_upload.return_value = {
            "public_id": "test_image_id",
            "url": "https://res.cloudinary.com/test/image/upload/test_image_id.jpg",
            "secure_url": "https://res.cloudinary.com/test/image/upload/test_image_id.jpg",
        }
        yield mock_upload