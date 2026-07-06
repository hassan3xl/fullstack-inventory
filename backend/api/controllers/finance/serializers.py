from rest_framework import serializers
from apps.finance.models import Debt, Expense
from api.controllers.sales.serializers import CustomerSerializer

class DebtSerializer(serializers.ModelSerializer):
    created_by_email = serializers.ReadOnlyField(source='created_by.email')
    customer = CustomerSerializer(read_only=True)
    customer_id = serializers.UUIDField(required=False, write_only=True, allow_null=True)

    class Meta:
        model = Debt
        fields = [
            'id',
            'customer',
            'customer_id',
            'debt_type',
            'debtor_creditor_name',
            'amount',
            'amount_paid',
            'description',
            'due_date',
            'status',
            'created_by_email',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by_email', 'created_at', 'updated_at']

    def validate(self, attrs):
        amount = attrs.get('amount')
        amount_paid = attrs.get('amount_paid', 0)
        
        # For updates, grab values from instance if they are not being updated
        if self.instance:
            if amount is None:
                amount = self.instance.amount
            if 'amount_paid' not in attrs:
                amount_paid = self.instance.amount_paid

        if amount_paid >= amount:
            attrs['status'] = Debt.DebtStatus.PAID
        elif amount_paid > 0:
            attrs['status'] = Debt.DebtStatus.PARTIALLY_PAID
        else:
            attrs['status'] = Debt.DebtStatus.PENDING

        return attrs

    def create(self, validated_data):
        customer_id = validated_data.pop('customer_id', None)
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        
        customer = None
        if customer_id:
            from apps.sales.models import Customer
            try:
                customer = Customer.objects.get(id=customer_id, tenant=tenant)
                # If name was not provided, default to customer name
                if not validated_data.get('debtor_creditor_name'):
                    validated_data['debtor_creditor_name'] = customer.name
            except Customer.DoesNotExist:
                pass
        
        validated_data['customer'] = customer
        return super().create(validated_data)

    def update(self, instance, validated_data):
        customer_id = validated_data.pop('customer_id', None)
        if customer_id is not None:
            if customer_id:
                request = self.context.get('request')
                tenant = getattr(request, 'tenant', None) if request else None
                from apps.sales.models import Customer
                try:
                    customer = Customer.objects.get(id=customer_id, tenant=tenant)
                    instance.customer = customer
                    # Also update name if needed
                    if not validated_data.get('debtor_creditor_name'):
                        instance.debtor_creditor_name = customer.name
                except Customer.DoesNotExist:
                    pass
            else:
                instance.customer = None

        return super().update(instance, validated_data)


class ExpenseSerializer(serializers.ModelSerializer):
    created_by_email = serializers.ReadOnlyField(source='created_by.email')

    class Meta:
        model = Expense
        fields = [
            'id',
            'category',
            'amount',
            'description',
            'expense_date',
            'created_by_email',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by_email', 'created_at', 'updated_at']
