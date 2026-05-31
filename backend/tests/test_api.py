# tests/test_api.py — just ask for it by name in the function argument
import pytest

@pytest.mark.django_db
def test_get_products(product):        # ← pytest sees "product", runs the fixture, passes it in
    assert product.name == "Laptop"

@pytest.mark.django_db
def test_product_price(product):       # ← same fixture, reused automatically
    assert product.price == 999

@pytest.mark.django_db
def test_user_exists(user):            # ← asks for "user" fixture
    assert user.username == "testuser"