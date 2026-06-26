import pytest
from datetime import date, timedelta
from apps.notifications.services import NotificationService
from apps.notifications.models import Notification, NotificationChannel, UserNotificationPreference
from apps.notifications.triggers import NotificationTriggers
from apps.tenants.models import TenantUser, Tenant
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
def test_role_based_and_store_level_notifications(tenant, user):
    # Set user role in tenant as admin
    TenantUser.objects.create(tenant=tenant, user=user, role=TenantUser.Role.ADMIN)
    
    # 1. Test role-based notification: admin role
    res = NotificationService.send_notification_to_tenant_users(
        tenant=tenant,
        title="Role-based alert",
        message="Only admins",
        roles=[TenantUser.Role.ADMIN],
        channels=[NotificationChannel.IN_APP]
    )
    assert res['sent'] == 1
    
    # Check that notification was received
    notif = Notification.objects.filter(user=user, title="Role-based alert").first()
    assert notif is not None
    assert notif.message == "Only admins"
    
    # 2. Test role-based notification: cashier role (should NOT receive)
    res_cashier = NotificationService.send_notification_to_tenant_users(
        tenant=tenant,
        title="Role-based cashier alert",
        message="Only cashiers",
        roles=[TenantUser.Role.CASHIER],
        channels=[NotificationChannel.IN_APP]
    )
    assert res_cashier['sent'] == 0
    assert not Notification.objects.filter(user=user, title="Role-based cashier alert").exists()

    # 3. Test store-level email notification setting: disabled for staff
    tenant.email_notifications_enabled = False
    tenant.save()
    
    # Email preference enabled for user
    pref, _ = UserNotificationPreference.objects.get_or_create(user=user)
    pref.email_enabled = True
    pref.save()
    
    notif_email = NotificationService.send_notification(
        user=user,
        title="Email Alert Test",
        message="Testing email restriction",
        channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        tenant=tenant
    )
    # The email channel should be removed since email_notifications_enabled is False on tenant and user is staff
    assert NotificationChannel.EMAIL not in notif_email.channels.split(",")
    
    # 4. Test duplicate check (within 24h)
    notif_dup = NotificationService.send_notification(
        user=user,
        title="Email Alert Test",
        message="Testing email restriction",
        channels=[NotificationChannel.IN_APP],
        tenant=tenant
    )
    assert notif_dup is None  # Should be skipped as duplicate
