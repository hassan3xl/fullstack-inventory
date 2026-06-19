from django.urls import path
from .views import (
    TenantRegisterAPIView,
    TenantListCreateAPIView,
    TenantDetailAPIView,
    TenantDashboardAPIView,
    TenantUserListAPIView,
    SubscribeTenantAPIView,
    SubscriptionPlanListAPIView,
)

urlpatterns = [
    path('register/',  TenantRegisterAPIView.as_view(),   name='api-tenant-register'),
    path('',           TenantListCreateAPIView.as_view(), name='api-tenant-list-create'),
    path('me/',        TenantDetailAPIView.as_view(),     name='api-tenant-detail'),
    path('dashboard/', TenantDashboardAPIView.as_view(),  name='api-tenant-dashboard'),
    path('users/',     TenantUserListAPIView.as_view(),   name='api-tenant-users'),
    path('plans/',     SubscriptionPlanListAPIView.as_view(), name='api-tenant-plans'),
    path('subscribe/', SubscribeTenantAPIView.as_view(), name='api-tenant-subscribe'),
]
