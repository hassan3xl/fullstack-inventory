# services/notification_service.py
from django.contrib.auth import get_user_model
import logging
from typing import List, Dict, Optional
from .models import Notification, NotificationChannel, UserNotificationPreference
from utils.resend import EmailSender

logger = logging.getLogger(__name__)
User = get_user_model()


class NotificationService:
    """
    Comprehensive notification service supporting in-app and email channels.
    """
    
    @staticmethod
    def send_notification(
        user: User,
        title: str,
        message: str,
        channels: List[str] = None,
        html_message: str = None,
        category: str = None,
        action_url: str = None,
        template_name: str = None,
        tenant = None,
    ) -> Optional[Notification]:
        """
        Send a notification to a single user.
        """
        if channels is None:
            channels = [NotificationChannel.IN_APP]

        # Duplicate check: don't send duplicate notifications within the last 24 hours
        from datetime import timedelta
        from django.utils import timezone
        one_day_ago = timezone.now() - timedelta(days=1)
        
        duplicate = Notification.objects.filter(
            user=user,
            title=title,
            message=message,
            category=category,
            created_at__gte=one_day_ago
        ).exists()
        
        if duplicate:
            logger.info(f"Duplicate notification ignored for {user.email}: {title}")
            return None

        # Check store-level email notifications setting
        if tenant and not getattr(tenant, "email_notifications_enabled", True):
            from apps.tenants.models import TenantUser
            tenant_user = TenantUser.objects.filter(tenant=tenant, user=user).first()
            # If the user is staff (role != OWNER) and email is in channels, remove it
            if tenant_user and tenant_user.role != TenantUser.Role.OWNER:
                channels = [c for c in channels if c != NotificationChannel.EMAIL]

        # Get or create user preferences
        preferences, _ = UserNotificationPreference.objects.get_or_create(user=user)

        # Filter channels based on preferences
        enabled_channels = [
            channel for channel in channels 
            if getattr(preferences, f"{channel}_enabled", True)
        ]

        if not enabled_channels:
            logger.warning(f"No enabled channels for {user.email}")
            return None

        # Create in-app notification
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            html_message=html_message or message,
            channels=",".join(enabled_channels),
            category=category,
            action_url=action_url,
        )

        # Send via enabled channels
        try:
            if NotificationChannel.EMAIL in enabled_channels:
                NotificationService._send_email_notification(user, title, message, html_message or message)
        except Exception as e:
            logger.error(f"Failed to send email notification to {user.email}: {e}")
            notification.is_sent = False
            notification.save()

        notification.is_sent = True
        notification.save()
        
        logger.info(f"Notification sent to {user.email}: {title}")
        return notification

    @staticmethod
    def send_bulk_notification(
        users: List[User],
        title: str,
        message: str,
        tenant = None,
        **kwargs,
    ) -> Dict[str, int]:
        """
        Send notifications to multiple users.
        """
        sent = 0
        failed = 0
        
        for user in users:
            try:
                NotificationService.send_notification(user, title, message, tenant=tenant, **kwargs)
                sent += 1
            except Exception as e:
                logger.error(f"Failed to send notification to {user.email}: {e}")
                failed += 1
        
        return {'sent': sent, 'failed': failed}

    @staticmethod
    def send_notification_to_user_by_email(
        email: str,
        title: str,
        message: str,
        **kwargs,
    ) -> Optional[Notification]:
        """Send notification by user email"""
        try:
            user = User.objects.get(email=email)
            return NotificationService.send_notification(user, title, message, **kwargs)
        except User.DoesNotExist:
            logger.warning(f"User with email {email} not found")
            return None

    @staticmethod
    def send_notification_to_tenant_users(
        tenant,
        title: str,
        message: str,
        roles: List[str] = None,
        **kwargs,
    ) -> Dict[str, int]:
        """Send notification to all users in a tenant, optionally filtered by roles"""
        
        # Base query for users in this tenant
        queryset = User.objects.filter(
            tenant_roles__tenant=tenant
        )
        
        if roles:
            queryset = queryset.filter(tenant_roles__role__in=roles)
            
        users = queryset.distinct()
        
        return NotificationService.send_bulk_notification(users, title, message, tenant=tenant, **kwargs)

    @staticmethod
    def send_activity_notification(
        user: User,
        activity_type: str,
        activity_description: str,
        **kwargs,
    ) -> Optional[Notification]:
        """Send activity-based notification"""
        title_map = {
            'product_added': 'New Product Added',
            'product_updated': 'Product Updated',
            'product_deleted': 'Product Removed',
            'order_created': 'New Order',
            'order_completed': 'Order Completed',
            'stock_low': 'Low Stock Alert',
            'user_added': 'New Team Member',
            'user_removed': 'Team Member Removed',
        }
        
        title = title_map.get(activity_type, 'Notification')
        
        return NotificationService.send_notification(
            user=user,
            title=title,
            message=activity_description,
            category=activity_type,
            **kwargs,
        )

    @staticmethod
    def _send_email_notification(user: User, title: str, message: str, html_message: str = None):
        """Send email notification using Resend"""
        try:
            user_name = getattr(user, 'first_name', None) or user.email.split('@')[0]
            
            EmailSender.send_notification(
                to=user.email,
                name=user_name,
                title=title,
                message=message,
                cta_text="View in Dashboard",
                cta_link="https://inventory.qstack.com.ng/dashboard"  # Update with your URL
            )
        except Exception as e:
            logger.error(f"Failed to send email via Resend: {e}")
            raise

    @staticmethod
    def get_user_notifications(
        user: User,
        category: str = None,
        is_read: bool = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple:
        """
        Get notifications for a user with filtering.
        
        Returns: (notifications, total_count)
        """
        queryset = Notification.objects.filter(user=user).order_by('-created_at')
        
        if category:
            queryset = queryset.filter(category=category)
        
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read)
        
        total_count = queryset.count()
        notifications = queryset[offset:offset + limit]
        
        return notifications, total_count

    @staticmethod
    def get_unread_count(user: User) -> int:
        """Get unread notification count for user"""
        return Notification.objects.filter(user=user, is_read=False).count()

    @staticmethod
    def mark_all_as_read(user: User) -> int:
        """Mark all user notifications as read"""
        count = Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return count

    @staticmethod
    def delete_old_notifications(days: int = 30) -> int:
        """Delete notifications older than specified days"""
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff_date = timezone.now() - timedelta(days=days)
        count = Notification.objects.filter(created_at__lt=cutoff_date).delete()[0]
        logger.info(f"Deleted {count} old notifications")
        return count
