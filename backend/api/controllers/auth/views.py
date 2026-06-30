# pyright: reportUnreachable=false


from rest_framework.response import Response
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.views import APIView
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import random
from apps.users.models import OTPRequest

def send_otp_email(email, code):
    subject = "Your Verification Code - Quantum Stack"
    message = f"Your verification code is: {code}\n\nThis code will expire in 10 minutes."
    
    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Quantum Stack</h2>
        <p>Hello,</p>
        <p>Please use the verification code below to complete your request. The code is valid for 10 minutes.</p>
        <div style="font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0; padding: 15px; background-color: #f3f4f6; color: #111827; border-radius: 6px; letter-spacing: 2px;">
            {code}
        </div>
        <p>If you did not make this request, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">Quantum Stack Inventory &copy; 2026</p>
    </div>
    """
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        html_message=html_message,
        fail_silently=False
    )

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from dj_rest_auth.views import LoginView
from apps.tenants.models import TenantUser

User = get_user_model()

def add_tenant_context_to_response(response, user, request):
    tenant = getattr(request, 'tenant', None)

    # Get user's tenants
    user_tenants = TenantUser.objects.filter(user=user).select_related('tenant')

    # Staff must belong to at least one tenant to log in
    if not user_tenants.exists() and user.role == User.RoleChoices.STAFF:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("This account is not associated with any store. Please contact your store administrator.")

    # Verify membership if tenant context was provided
    if tenant:
        has_access = user_tenants.filter(tenant=tenant).exists()
        if not has_access:
            return Response(
                {"detail": f"Account '{user.email}' is not registered with this business."},
                status=status.HTTP_403_FORBIDDEN
            )
        response.data['tenant_id'] = str(tenant.id)
        response.data['tenant_name'] = tenant.name
    elif user_tenants.exists():
        primary_tenant = user_tenants.first().tenant
        response.data['tenant_id'] = str(primary_tenant.id)
        response.data['tenant_name'] = primary_tenant.name
    else:
        response.data['tenant_id'] = None
        response.data['tenant_name'] = None

    response.data['available_tenants'] = [
        {
            'id': str(tu.tenant.id),
            'name': tu.tenant.name,
            'role': tu.role,
            'role_display': tu.get_role_display(),
        }
        for tu in user_tenants
    ]

    # Full permissions block — use these flags directly in the UI
    from .serializers import UserDetailSerializer
    response.data['permissions'] = UserDetailSerializer(
        user, context={'request': request}
    ).data.get('permissions', {})
    
    return response


class TenantLoginView(LoginView):
    """
    Enhanced login view that:
    1. Allows login without requiring tenant context (for development)
    2. Returns tenant_id + tenant_name for frontend routing
    3. Returns a `permissions` block so the frontend can immediately
       guard routes and sidebar items without an extra /me request
    """
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if email:
            try:
                user = User.objects.get(email__iexact=email)
                if not user.is_active:
                    return Response(
                        {"non_field_errors": ["Your account is currently inactive. Please check with your administrator or verify if registration approval is pending."]},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Ensure allauth EmailAddress record exists so email-based authentication succeeds
                from allauth.account.models import EmailAddress
                EmailAddress.objects.get_or_create(
                    user=user,
                    email=user.email,
                    defaults={'verified': True, 'primary': True}
                )
            except User.DoesNotExist:
                pass
            except Exception:
                pass

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            response = add_tenant_context_to_response(response, self.user, request)

        return response

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    # callback_url must match EXACTLY what you put in Google Cloud Console
    callback_url = "http://localhost:3000" 
    client_class = OAuth2Client

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = self.user
            # Automatically ensure user is active if registered via Google
            if not user.is_active:
                user.is_active = True
                user.save()
            response = add_tenant_context_to_response(response, user, request)
        return response

    
class RequestOTPView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user exists (for password reset flow)
        if not User.objects.filter(email__iexact=email).exists():
             return Response({"error": "User with this email not found."}, status=status.HTTP_404_NOT_FOUND)

        # Generate OTP
        code = f"{random.randint(100000, 999999)}"
        
        # Save OTP to database
        OTPRequest.objects.update_or_create(
            email=email,
            defaults={'otp_code': code, 'created_at': timezone.now(), 'is_verified': False}
        )

        try:
            send_otp_email(email, code)
            return Response({"message": "OTP sent successfully"})
        except Exception as e:
            return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RegisterOTPRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user already exists
        if User.objects.filter(email__iexact=email).exists():
             return Response({"error": "A user with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate OTP
        code = f"{random.randint(100000, 999999)}"
        
        # Save OTP to database
        OTPRequest.objects.update_or_create(
            email=email,
            defaults={'otp_code': code, 'created_at': timezone.now(), 'is_verified': False}
        )

        try:
            send_otp_email(email, code)
            return Response({"message": "Verification code sent successfully."})
        except Exception as e:
            return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyOTPView(APIView):
    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp')
        if not email or not otp_code:
            return Response({"error": "Email and OTP code are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_record = OTPRequest.objects.get(email=email)
        except OTPRequest.DoesNotExist:
            return Response({"error": "Request new OTP"}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.otp_code == otp_code and otp_record.is_valid():
            otp_record.is_verified = True
            otp_record.save()
            return Response({"message": "OTP Verified Successfully"})
        else:
            return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
        

class ResetPasswordView(APIView):
    def post(self, request):
        email = request.data.get('email')
        new_password = request.data.get('new_password')
        
        # Security Check: Ensure OTP was verified recently
        try:
            otp_record = OTPRequest.objects.get(email=email)
            if not otp_record.is_verified:
                 return Response({"error": "Please verify OTP first"}, status=403)
        except OTPRequest.DoesNotExist:
             return Response({"error": "Invalid Request"}, status=403)

        # Reset Password
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        
        # Clean up used OTP
        otp_record.delete()
        
        return Response({"message": "Password reset successfully"})


class CheckUserView(APIView):
    """Checks whether a given email corresponds to a user who can sign in to any tenant.

    POST payload: { email: string }

    Response:
      200: { allowed: bool, available_tenants: [...], detail?: string }
      404: { detail: 'User not found' }
      400: { detail: 'email required' }
    """
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # Gather tenant memberships
        user_tenants = TenantUser.objects.filter(user=user).select_related('tenant')

        available = []
        for tu in user_tenants:
            available.append({
                'id': str(tu.tenant.id),
                'name': tu.tenant.name,
                'role': tu.role,
                'role_display': tu.get_role_display(),
            })

        # Platform admins and tenants are allowed to log in without a tenant membership (e.g. for onboarding)
        allowed = user_tenants.exists() or user.role in [User.RoleChoices.TENANT, User.RoleChoices.PLATFORM_ADMIN]

        # If user exists but has no tenant membership and is not admin/tenant, disallow login
        if not allowed:
            return Response({
                'allowed': False,
                'available_tenants': [],
                'detail': "This account is not associated with any store. Please contact the store owner to get access."
            }, status=status.HTTP_200_OK)

        return Response({
            'allowed': True,
            'available_tenants': available,
        }, status=status.HTTP_200_OK)