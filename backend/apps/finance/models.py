import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings
from apps.tenants.models import TenantBaseModel

class Debt(TenantBaseModel):
    class DebtType(models.TextChoices):
        OWED_TO_US = 'owed_to_us', 'Owed to Us (Receivables)'
        OWED_BY_US = 'owed_by_us', 'Owed by Us (Payables)'

    class DebtStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PARTIALLY_PAID = 'partially_paid', 'Partially Paid'
        PAID = 'paid', 'Paid'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        'sales.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='debts'
    )
    debt_type = models.CharField(max_length=20, choices=DebtType.choices)
    debtor_creditor_name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=DebtStatus.choices, default=DebtStatus.PENDING)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_debts'
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "debts"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', '-created_at']),
            models.Index(fields=['tenant', 'status']),
        ]

    def __str__(self):
        return f"{self.debtor_creditor_name} - {self.debt_type} ({self.amount})"


class Expense(TenantBaseModel):
    class ExpenseCategory(models.TextChoices):
        RENT = 'rent', 'Rent'
        SALARIES = 'salaries', 'Salaries'
        UTILITIES = 'utilities', 'Utilities'
        PURCHASES = 'purchases', 'Purchases'
        MARKETING = 'marketing', 'Marketing'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.CharField(max_length=50, choices=ExpenseCategory.choices, default=ExpenseCategory.OTHER)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    expense_date = models.DateField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_expenses'
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "expenses"
        ordering = ['-expense_date', '-created_at']
        indexes = [
            models.Index(fields=['tenant', '-expense_date']),
            models.Index(fields=['tenant', 'category']),
        ]

    def __str__(self):
        return f"{self.category} - {self.amount}"
