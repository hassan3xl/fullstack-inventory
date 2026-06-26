# tests/test_models.py
import pytest
from decimal import Decimal
from apps.products.models import Product

# This decorator gives the test access to the database
@pytest.mark.django_db
def test_product_creation(tenant, category):
    product = Product.objects.create(tenant=tenant, category=category, name="Laptop", unit_price="999.00")
    assert product.name == "Laptop"
    assert product.unit_price == Decimal("999.00")

@pytest.mark.django_db
def test_product_count(tenant, category):
    Product.objects.create(tenant=tenant, category=category, name="Phone", unit_price="500.00")
    assert Product.objects.count() == 1

@pytest.mark.django_db
def test_product_packaging_uom(tenant, category):
    product = Product.objects.create(
        tenant=tenant,
        category=category,
        name="Maltina",
        unit_price="200.00",
        base_unit="Bottle",
        pack_unit="Crate",
        units_per_pack=24
    )
    assert product.base_unit == "Bottle"
    assert product.pack_unit == "Crate"
    assert product.units_per_pack == 24

    # Receive batch of 50 units (2 crates and 2 bottles)
    from apps.products.models import StockBatch
    batch = StockBatch.objects.create(
        tenant=tenant,
        product=product,
        batch_number="BATCH-01",
        quantity=50,
        initial_quantity=50
    )
    product.refresh_from_db()
    assert product.stock == 50
    assert product.stock_in_packs == 2
    assert product.stock_loose == 2
    assert batch.quantity_in_packs == 2
    assert batch.quantity_loose == 2