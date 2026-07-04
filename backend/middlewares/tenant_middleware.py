from apps.tenants.models import Tenant, TenantUser
from utils.tenant_context import set_current_tenant, clear_current_tenant

class TenantMiddleware:
    """
    Middleware to handle multi-tenant context.
    
    Priority order:
    1. X-Tenant header (for API requests)
    2. User's associated tenant (if authenticated)
    3. None (no tenant context)
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant = None
        
        # 1. Try X-Tenant Header (Best for development/Postman/API)
        tenant_id = request.headers.get('X-Tenant')
        
        # 2. Try to get tenant from header ID
        if tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id, is_active=True)
            except (Tenant.DoesNotExist, ValueError):
                pass
        
        # 3. If no tenant from headers but user is authenticated, get user's default tenant
        if not tenant and hasattr(request, 'user') and request.user and request.user.is_authenticated:
            try:
                tenant_user = TenantUser.objects.filter(user=request.user).first()
                if tenant_user:
                    tenant = tenant_user.tenant
            except Exception:
                pass
        
        request.tenant = tenant
        if tenant:
            set_current_tenant(tenant)

        try:
            response = self.get_response(request)
        finally:
            # Clean up after request (resets thread locals & DB context)
            clear_current_tenant()
        
        return response
