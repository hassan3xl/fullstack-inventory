from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DebtViewSet, ExpenseViewSet

router = DefaultRouter()
router.register('debts', DebtViewSet, basename='debts')
router.register('expenses', ExpenseViewSet, basename='expenses')

urlpatterns = [
    path('', include(router.urls)),
]
