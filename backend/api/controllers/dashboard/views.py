from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from apps.tenants.models import TenantUser
from apps.tenants.permissions.tenant_roles import HasTenantAccess, IsTenantAdmin, IsTenantManager
from apps.tenants.serializers import TenantSerializer
from utils.resend import EmailSender

class BusinessProfileAPIView(APIView):
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def _get_profile_data(self, tenant):
        from apps.tenants.models import TenantSubscription, SubscriptionPlan
        from apps.products.models import Product
        
        sub = TenantSubscription.plain_objects.filter(tenant=tenant, active=True).first()
        if sub:
            current_plan = {
                "name": sub.plan.name,
                "slug": sub.plan.slug,
                "price": sub.plan.price,
                "currency": sub.plan.currency,
                "max_products": sub.plan.max_products,
                "max_staff": sub.plan.max_staff,
                "has_customers": sub.plan.has_customers,
                "has_analytics": sub.plan.has_analytics,
                "features": sub.plan.features,
                "ends_at": sub.ends_at,
                "started_at": sub.started_at,
                "auto_renew": sub.auto_renew,
            }
        else:
            default_plan = SubscriptionPlan.objects.filter(is_default=True, is_active=True).first()
            if default_plan:
                current_plan = {
                    "name": default_plan.name,
                    "slug": default_plan.slug,
                    "price": default_plan.price,
                    "currency": default_plan.currency,
                    "max_products": default_plan.max_products,
                    "max_staff": default_plan.max_staff,
                    "has_customers": default_plan.has_customers,
                    "has_analytics": default_plan.has_analytics,
                    "features": default_plan.features,
                    "ends_at": None,
                    "started_at": tenant.created_at,
                    "auto_renew": True,
                }
            else:
                current_plan = None

        total_products = Product.plain_objects.filter(tenant=tenant).count()
        total_staff = tenant.users.count()

        return {
            "id": tenant.id,
            "name": tenant.name,
            "logo": tenant.logo.url if tenant.logo else None,
            "business_type": tenant.business_type,
            "category": tenant.get_business_type_display(),
            "is_active": tenant.is_active,
            "created_at": tenant.created_at,
            "current_plan": current_plan,
            "total_products": total_products,
            "total_staff": total_staff,
        }

    def get(self, request):
        tenant = request.tenant
        return Response(self._get_profile_data(tenant))

    def patch(self, request):
        tenant = request.tenant
        new_requested_name = request.data.get('name')
        if new_requested_name and new_requested_name != tenant.name:
            if request.tenant_user.role != TenantUser.Role.OWNER:
                return Response({"error": "Only the business owner can rename the store."}, status=status.HTTP_403_FORBIDDEN)

        old_name = tenant.name
        serializer = TenantSerializer(tenant, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            new_name = tenant.name
            if old_name != new_name:
                from apps.notifications.triggers import NotificationTriggers
                NotificationTriggers.on_tenant_name_changed(tenant, old_name, new_name, request.user)
            
            return Response(self._get_profile_data(tenant))
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BusinessLogoAPIView(APIView):
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def post(self, request):
        tenant = request.tenant
        logo_file = request.FILES.get('logo')
        if not logo_file:
            return Response({"error": "No logo file provided"}, status=400)

        tenant.logo = logo_file
        tenant.save()
        return Response({"message": "Logo updated successfully", "logo_url": tenant.logo.url})
    
class StaffProfileAPIView(APIView):
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get(self, request):
        tenant = request.tenant
        tenant_user = TenantUser.objects.get(user=request.user, tenant=tenant)

        return Response({
            "email": request.user.email,
            "role": tenant_user.role,
            "role_display": tenant_user.get_role_display(),
            "joined_at": tenant_user.created_at
        })

class DashboardStatsAPIView(APIView):
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get(self, request):
        tenant = request.tenant
        
        return Response({
            "total_products": 0,
            "total_staff": tenant.users.count(),
            "recent_activity": []
        })

class StaffListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsTenantManager]
    
    def get(self, request):
        tenant = request.tenant
        staff = TenantUser.objects.filter(tenant=tenant).select_related('user', 'user__profile')
        
        data = []
        for s in staff:
            profile = getattr(s.user, 'profile', None)
            if profile and (profile.first_name or profile.last_name):
                full_name = f"{profile.first_name} {profile.last_name}".strip()
            else:
                full_name = s.user.email.split('@')[0] # Fallback to email prefix
            
            data.append({
                "id": s.user.id,
                "email": s.user.email,
                "full_name": full_name,
                "role": s.role,
                "role_display": s.get_role_display(),
                "date_joined": s.created_at
            })
        
        return Response(data)

class StaffAddAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def post(self, request):
        tenant = request.tenant
        email = request.data.get('email')
        store_role = request.data.get('role', TenantUser.Role.CASHIER)
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if not email:
            return Response({"error": "Email is required"}, status=400)

        valid_roles = [r.value for r in TenantUser.Role]
        if store_role not in valid_roles:
            return Response(
                {"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"},
                status=400
            )

        # Check active plan limits for staff count
        from apps.tenants.models import TenantSubscription, SubscriptionPlan
        sub = TenantSubscription.plain_objects.filter(tenant=tenant, active=True).first()
        plan = sub.plan if sub else SubscriptionPlan.objects.filter(is_default=True, is_active=True).first()
        if plan:
            max_staff = plan.max_staff
            if max_staff != -1:
                current_staff_count = tenant.users.count()
                if current_staff_count >= max_staff:
                    return Response({
                        "error": f"You have reached the maximum staff limit of {max_staff} for your current '{plan.name}' plan. Please upgrade your subscription to add more staff."
                    }, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        from django.db import transaction
        from apps.users.models import Profile
        User = get_user_model()

        try:
            with transaction.atomic():
                # 1. Create or get User — provisioned staff get platform role = STAFF
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={'role': User.RoleChoices.STAFF}
                )

                if created:
                    import string
                    import random
                    password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
                    user.set_password(password)
                    user.save()
                else:
                    password = None

                # 2. Create or Update Profile
                Profile.objects.update_or_create(
                    user=user,
                    defaults={'first_name': first_name, 'last_name': last_name}
                )

                # 3. Check if already linked to this tenant
                if TenantUser.objects.filter(user=user, tenant=tenant).exists():
                    return Response(
                        {"detail": "User is already a member of this business"},
                        status=400
                    )

                # 4. Link to Tenant with the requested in-store role
                TenantUser.objects.create(user=user, tenant=tenant, role=store_role)

                # 5. Send email with login details if new user
                if created and password:
                    try:
                        user_display_name = f"{first_name} {last_name}".strip() or email.split('@')[0]
                        
                        EmailSender.send_notification(
                            to=email,
                            name=user_display_name,
                            title=f"Welcome to {tenant.name}",
                            message=f"You have been added to {tenant.name} as a {store_role}.<br><br>"
                                    f"<strong>Login Details:</strong><br>"
                                    f"Email: {email}<br>"
                                    f"Temporary Password: <code>{password}</code><br><br>"
                                    f"Please log in and change your password immediately for security.",
                            cta_text="Login Now",
                            cta_link="https://inventory.qstack.com.ng/login"  # Update with your frontend URL
                        )
                    except Exception as email_error:
                        print(f"Warning: Failed to send email to {email}: {str(email_error)}")
                        # Continue even if email fails

                return Response({
                    "message": "Staff member added successfully",
                    "email": email,
                    "store_role": store_role,
                    "platform_role": user.role,
                }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": f"Failed to add staff: {str(e)}"}, status=500)


class StaffDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def patch(self, request, user_id):
        tenant = request.tenant
        try:
            tenant_user = TenantUser.objects.get(user_id=user_id, tenant=tenant)
        except TenantUser.DoesNotExist:
            return Response({"error": "Staff member not found"}, status=404)

        # Prevent non-owners from modifying owner details
        if tenant_user.role == TenantUser.Role.OWNER and request.tenant_user.role != TenantUser.Role.OWNER:
            return Response({"error": "Only the business owner can modify owner details."}, status=status.HTTP_403_FORBIDDEN)

        role = request.data.get('role')
        if role:
            valid_roles = [r.value for r in TenantUser.Role]
            if role not in valid_roles:
                return Response(
                    {"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"},
                    status=400
                )
            tenant_user.role = role
            tenant_user.save()

        # Update profile if needed
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        if first_name is not None or last_name is not None:
            profile = tenant_user.user.profile
            if first_name is not None:
                profile.first_name = first_name
            if last_name is not None:
                profile.last_name = last_name
            profile.save()

        return Response({
            "message": "Staff member updated successfully",
            "role": tenant_user.role,
            "role_display": tenant_user.get_role_display()
        })

    def delete(self, request, user_id):
        tenant = request.tenant
        try:
            tenant_user = TenantUser.objects.get(user_id=user_id, tenant=tenant)
        except TenantUser.DoesNotExist:
            return Response({"error": "Staff member not found"}, status=404)

        # Owners cannot be deleted
        if tenant_user.role == TenantUser.Role.OWNER:
            return Response({"error": "Cannot remove the business owner"}, status=400)

        tenant_user.delete()
        return Response({"message": "Staff member removed from business context successfully"}, status=200)


