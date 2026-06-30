import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.users.models import OTPRequest

User = get_user_model()

@pytest.mark.django_db
def test_otp_registration_flow(client):
    # 1. Create a user to test duplicate registration check
    existing_email = "existing@example.com"
    User.objects.create_user(email=existing_email, password="password123!")

    # 2. Try requesting registration OTP for the existing email - should fail
    otp_request_url = reverse('otp_request_register')
    response = client.post(otp_request_url, {"email": existing_email}, content_type='application/json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "A user with this email already exists." in response.data["error"]

    # 3. Request registration OTP for a new email - should succeed
    new_email = "newuser@example.com"
    response = client.post(otp_request_url, {"email": new_email}, content_type='application/json')
    assert response.status_code == status.HTTP_200_OK
    assert "Verification code sent successfully." in response.data["message"]

    # 4. Verify OTPRequest was created in database
    otp_record = OTPRequest.objects.get(email=new_email)
    assert otp_record.otp_code is not None
    assert otp_record.is_verified is False

    # 5. Try registering with matching passwords but an INVALID OTP code - should fail
    register_url = reverse('rest_register')
    reg_data = {
        "email": new_email,
        "password1": "SecurePass123!",
        "password2": "SecurePass123!",
        "otp": "000000" # wrong OTP
    }
    response = client.post(register_url, reg_data, content_type='application/json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid or expired verification code." in response.data["otp"]

    # 6. Register with the CORRECT OTP code - should succeed
    reg_data["otp"] = otp_record.otp_code
    response = client.post(register_url, reg_data, content_type='application/json')
    assert response.status_code == status.HTTP_201_CREATED
    assert "access" in response.data
    assert "refresh" in response.data

    # 7. Verify user was created in DB
    assert User.objects.filter(email=new_email).exists()

    # 8. Verify OTPRequest record was cleaned up
    assert not OTPRequest.objects.filter(email=new_email).exists()
