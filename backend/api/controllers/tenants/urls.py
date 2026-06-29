from django.urls import path
from .views import (
    TenantRegisterAPIView,
    TenantListCreateAPIView,
    TenantDetailAPIView,
    TenantDashboardAPIView,
    TenantUserListAPIView,
    SubscribeTenantAPIView,
    SubscriptionPlanListAPIView,
    VerifyStoreAPIView,
    LinkPremiumStoreAPIView,
    UnlinkPremiumStoreAPIView,
    CreateBranchAPIView,
    ListBranchesAPIView,
)

urlpatterns = [
    path('register/',  TenantRegisterAPIView.as_view(),   name='api-tenant-register'),
    path('',           TenantListCreateAPIView.as_view(), name='api-tenant-list-create'),
    path('me/',        TenantDetailAPIView.as_view(),     name='api-tenant-detail'),
    path('dashboard/', TenantDashboardAPIView.as_view(),  name='api-tenant-dashboard'),
    path('users/',     TenantUserListAPIView.as_view(),   name='api-tenant-users'),
    path('plans/',     SubscriptionPlanListAPIView.as_view(), name='api-tenant-plans'),
    path('subscribe/', SubscribeTenantAPIView.as_view(), name='api-tenant-subscribe'),
    path('verify-store/', VerifyStoreAPIView.as_view(), name='api-tenant-verify-store'),
    path('link-store/', LinkPremiumStoreAPIView.as_view(), name='api-tenant-link-store'),
    path('unlink-store/', UnlinkPremiumStoreAPIView.as_view(), name='api-tenant-unlink-store'),
    path('branches/', ListBranchesAPIView.as_view(), name='api-tenant-branches'),
    path('branches/create/', CreateBranchAPIView.as_view(), name='api-tenant-branches-create'),
]
