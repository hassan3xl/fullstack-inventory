# tests/test_models.py
import pytest
from apps.products.models import Product

# This decorator gives the test access to the database
@pytest.mark.django_db
def test_product_creation():
    product = Product.objects.create(name="Laptop", price=999)
    assert product.name == "Laptop"
    assert product.price == 999

@pytest.mark.django_db
def test_product_count():
    Product.objects.create(name="Phone", price=500)
    assert Product.objects.count() == 1