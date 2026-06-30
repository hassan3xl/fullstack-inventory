from django.db import models
from django.utils import timezone
from datetime import timedelta

class OTPRequest(models.Model):
    email = models.EmailField(unique=True)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)
    is_verified = models.BooleanField(default=False)

    def is_valid(self):
        # OTP code is valid for 10 minutes
        return timezone.now() < self.created_at + timedelta(minutes=10)

    def __str__(self):
        return f"{self.email} - {self.otp_code}"
