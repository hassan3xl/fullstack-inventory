import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant, TenantUser

User = get_user_model()

@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        name="Test Business",
        business_type="general",
    )

@pytest.mark.django_db
def test_onboarding_registration_flow(client):
    # 1. Register a new tenant via the API endpoint
    register_url = reverse('api-tenant-register')
    data = {
        "business_name": "Test Quick Shop",
        "business_type": "general",
        "admin_email": "quickshop@example.com",
        "first_name": "Quick",
        "last_name": "Owner"
    }
    
    response = client.post(register_url, data, content_type='application/json')
    assert response.status_code == status.HTTP_201_CREATED
    assert "Registration received successfully" in response.data["message"]
    
    # 2. Verify user was created in an ACTIVE state (can login automatically)
    user = User.objects.get(email="quickshop@example.com")
    assert user.is_active is True
    
    # 3. Verify tenant was created in PENDING status
    tenant = Tenant.objects.get(name="Test Quick Shop")
    assert tenant.status == Tenant.StatusChoices.PENDING
    assert tenant.is_pending is True
    
    # 4. Verify owner tenant mapping
    tenant_user = TenantUser.objects.get(tenant=tenant, user=user)
    assert tenant_user.role == TenantUser.Role.OWNER


@pytest.mark.django_db
def test_tenant_approval_updates_status(client, tenant):
    # Create platform admin to run the admin approval
    admin_user = User.objects.create_superuser(
        email="platform_admin@example.com",
        password="adminpassword"
    )
    
    # Verify initial tenant status is PENDING
    assert tenant.status == Tenant.StatusChoices.PENDING
    assert tenant.is_pending is True
    
    # Authenticate admin user
    client.force_login(admin_user)
    
    # Post to tenant approve endpoint
    approve_url = reverse('tenant_approve', kwargs={'pk': tenant.id})
    response = client.post(approve_url)
    
    # Check redirect and refreshed status
    assert response.status_code == 302
    tenant.refresh_from_db()
    assert tenant.status == Tenant.StatusChoices.APPROVED
    assert tenant.is_pending is False


@pytest.mark.django_db
def test_user_profile_creation_on_save():
    # Verify that creating a user automatically creates a profile
    user = User.objects.create_user(
        email="profiletest@example.com",
        password="testpassword"
    )
    assert user.profile is not None
    assert user.profile.email_notifications is True
