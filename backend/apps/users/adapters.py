from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from apps.users.models.profiles import Profile

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form)
        
        # Get extra data from the Google/Social account
        extra_data = sociallogin.account.extra_data
        
        first_name = extra_data.get('given_name', '')
        last_name = extra_data.get('family_name', '')
        
        if not first_name and not last_name:
            name = extra_data.get('name', '')
            if name:
                parts = name.split(' ', 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ''

        # Update the profile
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.first_name = first_name
        profile.last_name = last_name
        profile.save()
        
        return user
