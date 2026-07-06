from datetime import datetime
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from utils.tenant_context import get_current_tenant

from apps.products.models import Category, Product, StockBatch, ProductInventory
from apps.sales.models import Customer, Sale, SaleItem
from apps.finance.models import Debt, Expense

from .serializers import (
    SyncCategorySerializer,
    SyncProductSerializer,
    SyncStockBatchSerializer,
    SyncProductInventorySerializer,
    SyncCustomerSerializer,
    SyncSaleSerializer,
    SyncSaleItemSerializer,
    SyncDebtSerializer,
    SyncExpenseSerializer
)

class SyncPullView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Pull all mutations that occurred since `last_pulled_at`.
        Input: { "last_pulled_at": "ISO-8601 timestamp" }
        """
        tenant = get_current_tenant()
        if not tenant:
            return Response({"detail": "Active tenant context required"}, status=status.HTTP_400_BAD_REQUEST)

        last_pulled_at_str = request.data.get('last_pulled_at')
        last_pulled_at = None
        if last_pulled_at_str:
            try:
                last_pulled_at = parse_datetime(last_pulled_at_str)
                if not last_pulled_at:
                    raise ValueError
            except Exception:
                return Response({"detail": "Invalid last_pulled_at timestamp format"}, status=status.HTTP_400_BAD_REQUEST)

        # Current server time
        server_timestamp = timezone.now().isoformat()

        # Query all records including soft-deleted ones (using plain_objects)
        categories = Category.plain_objects.filter(tenant=tenant)
        products = Product.plain_objects.filter(tenant=tenant)
        stock_batches = StockBatch.plain_objects.filter(tenant=tenant)
        product_inventories = ProductInventory.plain_objects.filter(tenant=tenant)
        customers = Customer.plain_objects.filter(tenant=tenant)
        sales = Sale.plain_objects.filter(tenant=tenant)
        sale_items = SaleItem.plain_objects.filter(tenant=tenant)
        debts = Debt.plain_objects.filter(tenant=tenant)
        expenses = Expense.plain_objects.filter(tenant=tenant)

        # Filter by last_pulled_at if present
        if last_pulled_at:
            categories = categories.filter(updated_at__gt=last_pulled_at)
            products = products.filter(updated_at__gt=last_pulled_at)
            stock_batches = stock_batches.filter(updated_at__gt=last_pulled_at)
            product_inventories = product_inventories.filter(updated_at__gt=last_pulled_at)
            customers = customers.filter(updated_at__gt=last_pulled_at)
            sales = sales.filter(updated_at__gt=last_pulled_at)
            # Filter sale_items by their parent sale's updated_at
            sale_items = sale_items.filter(sale__updated_at__gt=last_pulled_at)
            debts = debts.filter(updated_at__gt=last_pulled_at)
            expenses = expenses.filter(updated_at__gt=last_pulled_at)

        return Response({
            "changes": {
                "categories": SyncCategorySerializer(categories, many=True).data,
                "products": SyncProductSerializer(products, many=True).data,
                "stock_batches": SyncStockBatchSerializer(stock_batches, many=True).data,
                "product_inventories": SyncProductInventorySerializer(product_inventories, many=True).data,
                "customers": SyncCustomerSerializer(customers, many=True).data,
                "sales": SyncSaleSerializer(sales, many=True).data,
                "sale_items": SyncSaleItemSerializer(sale_items, many=True).data,
                "debts": SyncDebtSerializer(debts, many=True).data,
                "expenses": SyncExpenseSerializer(expenses, many=True).data,
            },
            "server_timestamp": server_timestamp
        }, status=status.HTTP_200_OK)


class SyncPushView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Process the outbox queue sent by the client.
        Input: {
            "mutations": [
                {
                    "action": "create"|"update"|"delete",
                    "table": "products"|"categories"|"customers"|"sales"|...,
                    "record_id": "uuid",
                    "payload": { ... }
                },
                ...
            ]
        }
        """
        tenant = get_current_tenant()
        if not tenant:
            return Response({"detail": "Active tenant context required"}, status=status.HTTP_400_BAD_REQUEST)

        mutations = request.data.get('mutations', [])
        if not isinstance(mutations, list):
            return Response({"detail": "mutations list is required"}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        errors = []

        # Process each mutation sequentially
        for mutation in mutations:
            action = mutation.get('action')
            table = mutation.get('table')
            record_id = mutation.get('record_id')
            payload = mutation.get('payload', {})

            try:
                # Resolve Model and Serializer
                if table == 'categories':
                    model = Category
                    serializer_class = SyncCategorySerializer
                elif table == 'products':
                    model = Product
                    serializer_class = SyncProductSerializer
                elif table == 'stock_batches':
                    model = StockBatch
                    serializer_class = SyncStockBatchSerializer
                elif table == 'product_inventories':
                    model = ProductInventory
                    serializer_class = SyncProductInventorySerializer
                elif table == 'customers':
                    model = Customer
                    serializer_class = SyncCustomerSerializer
                elif table == 'sales':
                    model = Sale
                    serializer_class = SyncSaleSerializer
                elif table == 'sale_items':
                    model = SaleItem
                    serializer_class = SyncSaleItemSerializer
                elif table == 'debts':
                    model = Debt
                    serializer_class = SyncDebtSerializer
                elif table == 'expenses':
                    model = Expense
                    serializer_class = SyncExpenseSerializer
                else:
                    errors.append({"record_id": record_id, "error": f"Unsupported table: {table}"})
                    continue

                if action == 'delete':
                    # Soft delete
                    instance = model.plain_objects.filter(tenant=tenant, id=record_id).first()
                    if instance:
                        instance.delete()
                        results.append({"record_id": record_id, "status": "deleted"})
                    else:
                        results.append({"record_id": record_id, "status": "already_deleted"})
                
                elif action in ['create', 'update']:
                    instance = model.plain_objects.filter(tenant=tenant, id=record_id).first()
                    
                    # Prevent duplicate creates (Idempotency)
                    if action == 'create' and instance:
                        results.append({"record_id": record_id, "status": "already_exists"})
                        continue
                    
                    if action == 'update' and not instance:
                        errors.append({"record_id": record_id, "error": f"Record not found for update"})
                        continue

                    # Last-Write-Wins (LWW) Conflict Resolution using updated_at comparison
                    client_updated_at_str = payload.get('updated_at')
                    if action == 'update' and instance and client_updated_at_str:
                        try:
                            client_updated_at = parse_datetime(client_updated_at_str)
                            if client_updated_at and instance.updated_at and client_updated_at <= instance.updated_at:
                                # Server has a newer update, discard client's stale update and mark as success/ignored
                                results.append({"record_id": record_id, "status": "conflict_resolved_server_won"})
                                continue
                        except Exception:
                            pass

                    # Serialize and save
                    serializer = serializer_class(instance, data=payload, partial=True)
                    if serializer.is_valid():
                        # Set tenant explicitly
                        serializer.save(tenant=tenant, id=record_id)
                        results.append({"record_id": record_id, "status": "success"})
                    else:
                        errors.append({"record_id": record_id, "error": serializer.errors})
            except Exception as e:
                errors.append({"record_id": record_id, "error": str(e)})

        # Return status
        return Response({
            "results": results,
            "errors": errors,
            "server_timestamp": timezone.now().isoformat()
        }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)
