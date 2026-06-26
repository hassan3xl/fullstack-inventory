from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from apps.tenants.models import Tenant, TenantUser
from apps.tenants.serializers import TenantSerializer, TenantDashboardSerializer
from apps.tenants.permissions.tenant_roles import HasTenantAccess
from django.contrib.auth import get_user_model
from utils.resend import EmailSender
import string
import random
from apps.tenants.models import SubscriptionPlan, TenantSubscription
from apps.tenants.serializers import SubscriptionPlanSerializer, TenantSubscriptionSerializer
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction

User = get_user_model()


class TenantRegisterAPIView(APIView):
    """
    Self-service tenant registration.
    POST /api/tenants/register/
    {
        "business_name": "My Store",
        "business_type": "pharmacy",
        "admin_email": "owner@example.com"
    }
    Creates the User (role=TENANT, is_active=False) and Tenant, then links them as OWNER.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        business_name = request.data.get('business_name')
        business_type = request.data.get('business_type', Tenant.BusinessType.GENERAL)
        admin_email = request.data.get('admin_email')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if not business_name or not admin_email:
            return Response(
                {"error": "business_name and admin_email are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.db import transaction
        try:
            with transaction.atomic():
                # 1. Create or get User — new registrations are business owners (TENANT role), set active immediately
                user, created = User.objects.get_or_create(
                    email=admin_email,
                    defaults={'role': User.RoleChoices.TENANT, 'is_active': True}
                )
                if created:
                    password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
                    user.set_password(password)
                    user.save()
                    
                    if hasattr(user, 'profile'):
                        user.profile.first_name = first_name
                        user.profile.last_name = last_name
                        user.profile.save()
                else:
                    if TenantUser.objects.filter(user=user).exists():
                        return Response(
                            {"error": f"User {admin_email} is already associated with a tenant"},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                # 2. Create Tenant
                tenant = Tenant.objects.create(name=business_name, business_type=business_type)

                # Assign default free subscription to newly created tenant
                try:
                    default_plan = SubscriptionPlan.objects.filter(is_default=True, is_active=True).first()
                    if default_plan:
                        TenantSubscription.plain_objects.create(
                            tenant=tenant,
                            plan=default_plan,
                            active=True,
                        )
                except Exception:
                    # don't block tenant creation if subscription assignment fails
                    pass

                # 3. Link owner — the registering user becomes the OWNER
                TenantUser.objects.create(tenant=tenant, user=user, role=TenantUser.Role.OWNER)

                # 4. Send welcome and login credentials emails
                try:
                    user_name = getattr(user.profile, 'first_name', None) or admin_email.split('@')[0]
                    
                    # Send welcome email
                    EmailSender.send_welcome(
                        to=admin_email,
                        name=user_name
                    )
                    
                    # Send login credentials email
                    from django.conf import settings
                    EmailSender.send_notification(
                        to=admin_email,
                        name=user_name,
                        title="Your Quantum Stack Inventory Account Setup",
                        message=f"Welcome to {tenant.name}! Your account has been created.<br><br>"
                                f"<strong>Login Details:</strong><br>"
                                f"Email: {admin_email}<br>"
                                f"Temporary Password: <code>{password}</code><br><br>"
                                f"Please log in and change your password immediately for security.",
                        cta_text="Login to Your Account",
                        cta_link=getattr(settings, "FRONTEND_URL", "http://inventory.qstack.com.ng")
                    )
                except Exception as email_error:
                    print(f"Warning: Failed to send emails to {admin_email}: {str(email_error)}")
                    # Continue even if email fails

                return Response({
                    "message": "Registration received successfully. Your account is active. You can now log in using the temporary credentials sent to your email.",
                    "business_name": tenant.name,
                    "admin_email": admin_email
                }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Registration failed: {str(e)}"}, status=500)


class TenantListCreateAPIView(generics.ListCreateAPIView):
    """
    Platform-level list of all tenants (admin use).
    GET  /api/tenants/
    POST /api/tenants/   — creates a tenant and assigns the current user as OWNER
    """
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        tenant = serializer.save()
        TenantUser.objects.create(tenant=tenant, user=self.request.user, role=TenantUser.Role.OWNER)
        # Assign default free subscription on tenant creation
        try:
            default_plan = SubscriptionPlan.objects.filter(is_default=True, is_active=True).first()
            if default_plan:
                from apps.tenants.models import TenantSubscription as _TS
                _TS.plain_objects.create(tenant=tenant, plan=default_plan, active=True)
        except Exception:
            pass


class TenantDetailAPIView(APIView):
    """
    Retrieve or update the current tenant's details.
    GET   /api/tenants/me/
    PATCH /api/tenants/me/
    """
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get(self, request):
        tenant = request.tenant
        serializer = TenantSerializer(tenant)
        return Response(serializer.data)

    def patch(self, request):
        tenant = request.tenant
        serializer = TenantSerializer(tenant, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TenantDashboardAPIView(APIView):
    """
    Summary stats for the current tenant's dashboard.
    GET /api/tenants/dashboard/
    """
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get(self, request):
        tenant = request.tenant
        data = {
            "business_name": tenant.name,
            "business_type": tenant.get_business_type_display(),
            "total_products": 0,  # linked later
            "total_staff": tenant.users.count(),
        }
        serializer = TenantDashboardSerializer(data)
        return Response(serializer.data)


class TenantUserListAPIView(generics.ListAPIView):
    """
    List all users (staff) in the current tenant.
    GET /api/tenants/users/
    """
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return TenantUser.objects.none()
        return TenantUser.objects.filter(tenant=tenant).select_related('user')


class SubscriptionPlanListAPIView(generics.ListAPIView):
    """List all active subscription plans (public)."""
    queryset = SubscriptionPlan.objects.filter(is_active=True).order_by('-is_default', 'price')
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [AllowAny]


class SubscribeTenantAPIView(APIView):
    """Subscribe the current tenant to a plan.

    POST payload: { plan_slug: string }
    """
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def post(self, request):
        plan_slug = request.data.get('plan_slug')
        if not plan_slug:
            return Response({'detail': 'plan_slug is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = SubscriptionPlan.objects.get(slug=plan_slug, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'detail': 'Plan not found'}, status=status.HTTP_404_NOT_FOUND)

        tenant = request.tenant

        # Basic Stripe stub: in a real implementation, create a Stripe subscription and return id
        stripe_subscription_id = f"stub_{tenant.id.hex}_{plan.slug}"

        # Deactivate existing subscriptions and create a new record
        with transaction.atomic():
            TenantSubscription.plain_objects.filter(tenant=tenant, active=True).update(active=False)
            sub = TenantSubscription.plain_objects.create(
                tenant=tenant,
                plan=plan,
                active=True,
                stripe_subscription_id=stripe_subscription_id,
            )

        serializer = TenantSubscriptionSerializer(sub)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VerifyStoreAPIView(APIView):
    """
    Verify store existence by store_id.
    GET /api/tenants/verify-store/?store_id=STORE-XXXXXX
    """
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get(self, request):
        store_id = request.query_params.get('store_id')
        if not store_id:
            return Response({'detail': 'store_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            store = Tenant.objects.get(store_id=store_id.strip().upper())
        except Tenant.DoesNotExist:
            return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'id': store.id,
            'name': store.name,
            'store_id': store.store_id,
            'current_plan': store.current_plan.name if store.current_plan else 'Free Plan',
        })


class LinkPremiumStoreAPIView(APIView):
    """
    Link a store to an Enterprise subscription.
    POST /api/tenants/link-store/
    { "store_id": "STORE-XXXXXX" }
    """
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def post(self, request):
        store_id = request.data.get('store_id')
        if not store_id:
            return Response({'detail': 'store_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        parent_tenant = request.tenant
        current_plan = parent_tenant.current_plan

        if not current_plan or current_plan.slug != 'enterprise':
            return Response({'detail': 'Only Enterprise plans can link other stores.'}, status=status.HTTP_403_FORBIDDEN)

        if parent_tenant.linked_premium_stores.count() >= 1:
            return Response({'detail': 'You have reached the maximum of 2 stores on this plan (1 parent + 1 invited).'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_store = Tenant.objects.get(store_id=store_id.strip().upper())
        except Tenant.DoesNotExist:
            return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_store.id == parent_tenant.id:
            return Response({'detail': 'You cannot link your own store to itself.'}, status=status.HTTP_400_BAD_REQUEST)

        if target_store.parent_enterprise_tenant:
            return Response({'detail': 'This store is already linked to an Enterprise plan.'}, status=status.HTTP_400_BAD_REQUEST)

        # Deactivate target store's own active subscriptions
        with transaction.atomic():
            TenantSubscription.plain_objects.filter(tenant=target_store, active=True).update(active=False)
            target_store.parent_enterprise_tenant = parent_tenant
            target_store.save()

        return Response({
            'message': f'Successfully linked {target_store.name} to your Enterprise plan.',
            'store': TenantSerializer(target_store).data
        })


class UnlinkPremiumStoreAPIView(APIView):
    """
    Unlink a store from an Enterprise subscription.
    POST /api/tenants/unlink-store/
    { "store_id": "STORE-XXXXXX" }
    """
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def post(self, request):
        store_id = request.data.get('store_id')
        if not store_id:
            return Response({'detail': 'store_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        parent_tenant = request.tenant
        try:
            target_store = Tenant.objects.get(store_id=store_id.strip().upper(), parent_enterprise_tenant=parent_tenant)
        except Tenant.DoesNotExist:
            return Response({'detail': 'Linked store not found under your account.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            target_store.parent_enterprise_tenant = None
            target_store.save()
            # Restore default free subscription
            default_plan = SubscriptionPlan.objects.filter(is_default=True, is_active=True).first()
            if default_plan:
                TenantSubscription.plain_objects.create(
                    tenant=target_store,
                    plan=default_plan,
                    active=True,
                )

        return Response({'message': f'Successfully unlinked {target_store.name} from your plan.'})
