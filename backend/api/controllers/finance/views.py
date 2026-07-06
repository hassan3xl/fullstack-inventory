from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.tenants.permissions.tenant_roles import HasTenantAccess, IsTenantManager
from apps.finance.models import Debt, Expense
from .serializers import DebtSerializer, ExpenseSerializer

class DebtViewSet(viewsets.ModelViewSet):
    serializer_class = DebtSerializer

    def get_queryset(self):
        # TenantBaseModel's manager automatically restricts queries to request.tenant
        return Debt.objects.all()

    def get_permissions(self):
        # Only owners, admins, and managers can delete debts
        if self.action in ['destroy']:
            return [IsAuthenticated(), IsTenantManager()]
        # Any store member can list, view details, add, or update/pay debts
        return [IsAuthenticated(), HasTenantAccess()]

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        # TenantBaseModel's manager automatically restricts queries to request.tenant
        return Expense.objects.all()

    def get_permissions(self):
        # Only owners, admins, and managers can modify or delete expenses
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsTenantManager()]
        # Any store member can list, view details, or record new expenses
        return [IsAuthenticated(), HasTenantAccess()]

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )
