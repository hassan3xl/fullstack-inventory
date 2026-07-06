from rest_framework import serializers
from apps.products.models import Category, Product, StockBatch, ProductInventory
from apps.sales.models import Customer, Sale, SaleItem
from apps.finance.models import Debt, Expense

class SyncCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'business_type', 'default_best_before_days', 'expiry_strategy', 'created_at', 'updated_at', 'deleted']

class SyncProductSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(source='category', queryset=Category.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'stock', 'unit_price', 'pack_price', 'variants', 'capacities', 'base_unit', 'pack_unit', 'units_per_pack', 'category_id', 'is_active', 'created_at', 'updated_at', 'deleted']

class SyncStockBatchSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(source='product', queryset=Product.objects.all())
    
    class Meta:
        model = StockBatch
        fields = ['id', 'product_id', 'batch_number', 'quantity', 'initial_quantity', 'production_date', 'expiry_date', 'created_at', 'updated_at', 'deleted']

class SyncProductInventorySerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(source='product', queryset=Product.objects.all())
    
    class Meta:
        model = ProductInventory
        fields = ['id', 'product_id', 'sku', 'low_stock_threshold', 'track_inventory', 'created_at', 'updated_at', 'deleted']

class SyncCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'created_at', 'updated_at', 'deleted']

class SyncSaleItemSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(source='product', queryset=Product.objects.all())
    sale_id = serializers.PrimaryKeyRelatedField(source='sale', queryset=Sale.objects.all())
    
    class Meta:
        model = SaleItem
        fields = ['id', 'sale_id', 'product_id', 'quantity', 'unit_price', 'total_price', 'variant', 'capacity', 'sell_unit', 'deleted']

class SyncSaleSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(source='customer', queryset=Customer.objects.all(), required=False, allow_null=True)
    cashier_id = serializers.PrimaryKeyRelatedField(source='cashier', read_only=True)
    items = SyncSaleItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Sale
        fields = ['id', 'sale_number', 'cashier_id', 'customer_id', 'subtotal', 'tax', 'discount', 'total_amount', 'payment_method', 'payment_status', 'created_at', 'updated_at', 'deleted', 'items']

class SyncDebtSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(source='customer', queryset=Customer.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Debt
        fields = ['id', 'customer_id', 'debt_type', 'debtor_creditor_name', 'amount', 'amount_paid', 'description', 'due_date', 'status', 'created_at', 'updated_at', 'deleted']

class SyncExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ['id', 'category', 'amount', 'description', 'expense_date', 'created_at', 'updated_at', 'deleted']
