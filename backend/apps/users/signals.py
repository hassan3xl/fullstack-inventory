from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.users.models.users import User
from apps.users.models.profiles import Profile

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)
        
        # Send welcome email and in-app notification to the newly created user
        try:
            from apps.notifications.services import NotificationService
            from apps.notifications.models import NotificationChannel
            
            title = "Welcome to Quantum Stack!"
            message = (
                "Thank you for registering with Quantum Stack! We are excited to help you "
                "manage your business inventory, track sales, and grow. Let's get started by "
                "setting up your business profile."
            )
            
            NotificationService.send_notification(
                user=instance,
                title=title,
                message=message,
                channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                category="welcome"
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send welcome notifications for user {instance.email}: {e}")

