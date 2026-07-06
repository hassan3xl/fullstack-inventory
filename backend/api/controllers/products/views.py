from rest_framework import viewsets
from apps.products.models import Product, Category, StockBatch
from apps.products.api import (
    ProductCategorySerializer,
    ProductSerializer,
    ProductCreateSerializer,
    ProductInventoryWriteSerializer,
)

# from ..config.permissions import IsMerchantUser, IsActiveVerifiedMerchant
from apps.tenants.permissions.tenant_roles import HasTenantAccess, IsTenantManager, IsTenantAdmin
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action

from django.db.models import Sum, F, Q
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination

class InventoryStatsView(APIView):
    permission_classes = [IsAuthenticated, HasTenantAccess]

    def get(self, request):
        now = timezone.now().date()
        
        # Self-healing: Update stock for products whose earliest expiry date has passed but still show stock
        expired_with_stock = Product.objects.filter(expiry_date__lt=now, stock__gt=0)
        for p in expired_with_stock:
            p.update_stock_from_batches()
            
        # Trigger product expiry notifications
        from apps.notifications.triggers import NotificationTriggers
        NotificationTriggers.check_and_trigger_expiry_notifications(request.tenant)
            
        # Total value calculation: Sum(stock * unit_price)
        total_value = Product.objects.all().aggregate(
            total=Sum(F('stock') * F('unit_price'))
        )['total'] or 0

        total_items = Product.objects.all().aggregate(
            total=Sum('stock')
        )['total'] or 0

        low_stock_count = Product.objects.filter(stock__lte=5).count() # Static threshold for now
        out_of_stock_count = Product.objects.filter(stock=0).count()
        
        expired_count = Product.objects.filter(expiry_date__lt=now).count()
        near_expiry_count = Product.objects.filter(
            expiry_date__range=[now, now + timezone.timedelta(days=30)]
        ).count()

        return Response({
            "total_value": total_value,
            "total_items": total_items,
            "product_count": Product.objects.count(),
            "low_stock": low_stock_count,
            "out_of_stock": out_of_stock_count,
            "expired": expired_count,
            "near_expiry": near_expiry_count,
        })

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ProductCategorySerializer
    lookup_field = 'name'
    
    from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsTenantAdmin()]
        return [IsAuthenticated(), HasTenantAccess()]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        qs = Category.plain_objects.all()
        if tenant:
            # Return global preset categories (tenant=None) + tenant's own categories
            # both scoped to the tenant's business type
            from django.db.models import Q
            qs = qs.filter(
                Q(business_type=tenant.business_type) | Q(business_type='general')
            ).filter(
                Q(tenant=tenant) | Q(tenant__isnull=True)
            )
        return qs.order_by('name')

    def perform_create(self, serializer):
        tenant = getattr(self.request, 'tenant', None)
        business_type = tenant.business_type if tenant else 'general'
        name = serializer.validated_data.get('name')
        if Category.plain_objects.filter(
            Q(tenant=tenant) | Q(tenant__isnull=True),
            name__iexact=name
        ).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"name": "A category with this name already exists."})
        category = serializer.save(tenant=tenant, business_type=business_type)
        if tenant:
            from apps.notifications.triggers import NotificationTriggers
            user_name = self.request.user.email.split('@')[0]
            NotificationTriggers.on_category_created(tenant, category.name, user_name)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.tenant is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You cannot update global preset categories.")
        
        name = serializer.validated_data.get('name')
        if name and name.lower() != instance.name.lower():
            tenant = getattr(self.request, 'tenant', None)
            from django.db.models import Q
            if Category.plain_objects.filter(
                Q(tenant=tenant) | Q(tenant__isnull=True),
                name__iexact=name
            ).exclude(id=instance.id).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"name": "A category with this name already exists."})
                
        old_name = instance.name
        category = serializer.save()
        tenant = getattr(self.request, 'tenant', None)
        if tenant:
            from apps.notifications.triggers import NotificationTriggers
            user_name = self.request.user.email.split('@')[0]
            NotificationTriggers.on_category_updated(tenant, old_name, category.name, user_name)

    def perform_destroy(self, instance):
        if instance.tenant is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You cannot delete global preset categories.")
        if instance.products.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "Cannot delete category because it contains active products. Reassign or delete the products first."})
        
        category_name = instance.name
        instance.delete()
        tenant = getattr(self.request, 'tenant', None)
        if tenant:
            from apps.notifications.triggers import NotificationTriggers
            user_name = self.request.user.email.split('@')[0]
            NotificationTriggers.on_category_deleted(tenant, category_name, user_name)

    @action(detail=False, methods=['get'], url_path='presets')
    def presets(self, request):
        """
        Return the built-in category presets for the tenant's business type.
        GET /api/inventory/products/categories/presets/
        """
        tenant = getattr(request, 'tenant', None)
        business_type = tenant.business_type if tenant else 'general'
        preset_list = Category.PRESETS.get(business_type, Category.PRESETS['general'])
        return Response({
            'business_type': business_type,
            'categories': preset_list,
        })


from rest_framework.pagination import PageNumberPagination

class ProductPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    # Paginate products: 10 per page by default, allow client override via `page_size` query param
    class TenPerPagePagination(PageNumberPagination):
        page_size = 10
        page_size_query_param = 'page_size'
        max_page_size = 100

    pagination_class = TenPerPagePagination
    pagination_class = ProductPagination

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination', '').lower() == 'true':
            return None
        return super().paginate_queryset(queryset)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsTenantAdmin()]
        if self.action in ['toggle_active']:
            return [IsAuthenticated(), IsTenantManager()]
        return [IsAuthenticated(), HasTenantAccess()]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductSerializer

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        product = self.get_object()
        product.is_active = not product.is_active
        product.save()
        
        from apps.notifications.triggers import NotificationTriggers
        user_name = self.request.user.email.split('@')[0]
        NotificationTriggers.on_product_updated(self.request.tenant, product.name, user_name)
        
        return Response({
            'status': 'success',
            'is_active': product.is_active,
            'message': f"Product '{product.name}' is now {'active' if product.is_active else 'inactive'}."
        }, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        tenant = self.request.tenant
        
        # Check active plan limits for product count
        from apps.tenants.models import TenantSubscription, SubscriptionPlan
        sub = TenantSubscription.plain_objects.filter(tenant=tenant, active=True).first()
        plan = sub.plan if sub else SubscriptionPlan.objects.filter(is_default=True, is_active=True).first()
        if plan:
            max_products = plan.max_products
            if max_products != -1:
                current_product_count = Product.plain_objects.filter(tenant=tenant).count()
                if current_product_count >= max_products:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({
                        "detail": f"You have reached the maximum product limit of {max_products} for your current '{plan.name}' plan. Please upgrade your subscription to add more products."
                    })
        
        product = serializer.save(tenant=tenant)
        from apps.notifications.triggers import NotificationTriggers
        user_name = self.request.user.email.split('@')[0]
        NotificationTriggers.on_product_added(tenant, product.name, user_name)

    def perform_update(self, serializer):
        tenant = self.request.tenant
        product = serializer.save()
        from apps.notifications.triggers import NotificationTriggers
        user_name = self.request.user.email.split('@')[0]
        NotificationTriggers.on_product_updated(tenant, product.name, user_name)
        
        # Check stock alerts (low stock / out of stock)
        from apps.products.models import ProductInventory
        inv = ProductInventory.objects.filter(product=product).first()
        threshold = inv.low_stock_threshold if inv else 5
        if product.stock == 0:
            NotificationTriggers.on_product_out_of_stock(tenant, product.name)
        elif product.stock <= threshold:
            NotificationTriggers.on_product_stock_low(tenant, product.name, product.stock)

    def perform_destroy(self, instance):
        tenant = self.request.tenant
        product_name = instance.name
        instance.delete()
        from apps.notifications.triggers import NotificationTriggers
        user_name = self.request.user.email.split('@')[0]
        NotificationTriggers.on_product_deleted(tenant, product_name, user_name)

    def get_queryset(self):
        """
        Supported query params:
          ?expiring_in=<days>  — products whose earliest expiry is within N days
          ?expired=true        — products already past expiry
          ?low_stock=true      — products at or below their low-stock threshold (default 5)
          ?status=<value>      — shorthand: expired | critical | near_expiry | low | out_of_stock | ok
          ?search=<text>       — filter by product name (case-insensitive)
          ?category=<name>     — filter by category name
        """
        from django.utils import timezone as tz
        now = tz.now().date()

        # Self-healing: Update stock for products whose earliest expiry date has passed but still show stock
        expired_with_stock = Product.objects.filter(expiry_date__lt=now, stock__gt=0)
        for p in expired_with_stock:
            p.update_stock_from_batches()

        qs = Product.objects.all()
        p = self.request.query_params

        # Text search
        if search := p.get('search'):
            qs = qs.filter(name__icontains=search)

        # Category filter
        if category := p.get('category'):
            qs = qs.filter(category__name__iexact=category)

        # Expiry filters
        if p.get('expired', '').lower() == 'true':
            qs = qs.filter(expiry_date__lt=now)

        elif expiring_in := p.get('expiring_in'):
            try:
                days = int(expiring_in)
                qs = qs.filter(
                    expiry_date__isnull=False,
                    expiry_date__range=[now, now + timezone.timedelta(days=days)]
                )
            except ValueError:
                pass

        # Stock filters
        if p.get('low_stock', '').lower() == 'true':
            qs = qs.filter(stock__gt=0, stock__lte=5)

        if p.get('out_of_stock', '').lower() == 'true':
            qs = qs.filter(stock=0)

        # Shorthand status filter
        if status_param := p.get('status'):
            if status_param == 'expired':
                qs = qs.filter(expiry_date__lt=now)
            elif status_param == 'critical':
                qs = qs.filter(expiry_date__range=[now, now + timezone.timedelta(days=7)])
            elif status_param == 'near_expiry':
                qs = qs.filter(expiry_date__range=[now + timezone.timedelta(days=8), now + timezone.timedelta(days=30)])
            elif status_param == 'low':
                qs = qs.filter(stock__gt=0, stock__lte=5)
            elif status_param == 'out_of_stock':
                qs = qs.filter(stock=0)

        # Active status filter
        if active_status := p.get('active_status'):
            if active_status == 'active':
                qs = qs.filter(is_active=True)
            elif active_status == 'inactive':
                qs = qs.filter(is_active=False)

        return qs.order_by('-created_at')


class BatchReceiveView(APIView):
    """
    Receive a new stock delivery for an existing product.
    Creates a StockBatch and updates the product's aggregate stock.

    POST /api/inventory/products/<product_id>/batches/
    {
        "batch_number": "BATCH-2025-003",   // optional, auto-generated if blank
        "quantity": 80,
        "production_date": "2025-05-01",    // optional
        "expiry_date": "2025-08-01"          // optional; computed from category default if omitted
    }
    """
    permission_classes = [IsAuthenticated, IsTenantManager]

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)

        quantity = request.data.get('quantity')
        packs = request.data.get('packs')
        loose = request.data.get('loose')

        if packs is not None or loose is not None:
            try:
                p_val = int(packs) if packs is not None else 0
                l_val = int(loose) if loose is not None else 0
                if p_val < 0 or l_val < 0:
                    return Response({'error': 'packs and loose must be non-negative integers'}, status=status.HTTP_400_BAD_REQUEST)
                quantity = (p_val * product.units_per_pack) + l_val
            except (ValueError, TypeError):
                return Response({'error': 'packs and loose must be valid integers'}, status=status.HTTP_400_BAD_REQUEST)

        if quantity is None:
            return Response({'error': 'quantity or packaging units (packs/loose) is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            quantity = int(quantity)
            if quantity <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'quantity must be a positive integer'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-generate batch number if not provided
        batch_number = request.data.get('batch_number') or f"{product.name[:6].upper().replace(' ', '')}-{StockBatch.objects.filter(product=product).count() + 1:04d}"

        batch = StockBatch(
            product=product,
            batch_number=batch_number,
            quantity=quantity,
            initial_quantity=quantity,
            production_date=request.data.get('production_date') or None,
            expiry_date=request.data.get('expiry_date') or None,
        )
        batch.save()  # triggers expiry auto-calc + product stock update

        from apps.notifications.triggers import NotificationTriggers
        user_name = request.user.email.split('@')[0]
        NotificationTriggers.on_batch_received(request.tenant, product.name, batch.batch_number, batch.quantity, user_name)

        from apps.products.serializers import StockBatchSerializer as _BS
        return Response({
            'message': f"Batch '{batch_number}' received successfully.",
            'batch': _BS(batch).data,
            'product_stock': product.stock,
        }, status=status.HTTP_201_CREATED)

    def get(self, request, product_id):
        """List all batches for this product, FEFO ordered."""
        product = get_object_or_404(Product, pk=product_id)
        from django.db.models import Case, When, Value, IntegerField
        batches = product.batches.annotate(
            has_expiry=Case(
                When(expiry_date__isnull=True, then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).order_by('has_expiry', 'expiry_date')
        from apps.products.serializers import StockBatchSerializer as _BS
        return Response(_BS(batches, many=True).data)


class BatchDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTenantManager]

    def patch(self, request, product_id, pk):
        batch = get_object_or_404(StockBatch, product_id=product_id, pk=pk)

        # Update batch fields
        if 'batch_number' in request.data:
            batch.batch_number = request.data['batch_number']
        
        packs = request.data.get('packs')
        loose = request.data.get('loose')
        if packs is not None or loose is not None:
            try:
                p_val = int(packs) if packs is not None else batch.quantity_in_packs
                l_val = int(loose) if loose is not None else batch.quantity_loose
                if p_val < 0 or l_val < 0:
                    return Response({'error': 'packs and loose must be non-negative integers'}, status=status.HTTP_400_BAD_REQUEST)
                batch.quantity = (p_val * batch.product.units_per_pack) + l_val
            except (ValueError, TypeError):
                return Response({'error': 'packs and loose must be valid integers'}, status=status.HTTP_400_BAD_REQUEST)
        elif 'quantity' in request.data:
            batch.quantity = int(request.data['quantity'])

        if 'initial_quantity' in request.data:
            batch.initial_quantity = int(request.data['initial_quantity'])
        if 'production_date' in request.data:
            batch.production_date = request.data['production_date'] or None
        if 'expiry_date' in request.data:
            batch.expiry_date = request.data['expiry_date'] or None

        batch.save()  # triggers recalculation and save

        from apps.notifications.triggers import NotificationTriggers
        user_name = request.user.email.split('@')[0]
        NotificationTriggers.on_batch_updated(request.tenant, batch.product.name, batch.batch_number, batch.quantity, user_name)

        from apps.products.serializers import StockBatchSerializer as _BS
        return Response(_BS(batch).data)

    def delete(self, request, product_id, pk):
        batch = get_object_or_404(StockBatch, product_id=product_id, pk=pk)
        batch_number = batch.batch_number
        product_name = batch.product.name
        batch.delete()  # triggers overridden delete which recalculates totals
        
        from apps.notifications.triggers import NotificationTriggers
        user_name = request.user.email.split('@')[0]
        NotificationTriggers.on_batch_deleted(request.tenant, product_name, batch_number, user_name)
        
        return Response({"status": "success", "message": "Batch deleted successfully"}, status=status.HTTP_200_OK)


class ProductInventoryView(APIView):
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def patch(self, request, pk):
        product = get_object_or_404(Product, pk=pk)

        serializer = ProductInventoryWriteSerializer(
            data=request.data,
        )
        if serializer.is_valid():
            serializer.save(product=product)
            return Response(
                {"message": "Inventory updated successfully"},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




class ProductImagesViewSet(viewsets.ViewSet):
    from rest_framework.parsers import MultiPartParser, FormParser
    parser_classes = (MultiPartParser, FormParser)

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'set_primary']:
            return [IsAuthenticated(), IsTenantAdmin()]
        return [IsAuthenticated(), HasTenantAccess()]

    # GET /products/<product_id>/images/
    def list(self, request, product_id=None):
        product = get_object_or_404(Product, id=product_id)
        if product.image:
            return Response([{"id": "primary", "image": product.image.url, "is_primary": True}])
        return Response([])

    # POST /products/<product_id>/images/
    def create(self, request, product_id=None):
        product = get_object_or_404(Product, id=product_id)

        file = request.FILES.get("image")
        if not file:
            return Response({"error": "No image provided"}, status=400)

        product.image = file
        product.save()

        return Response({"status": "success", "id": "primary"}, status=201)

    # DELETE /products/<product_id>/images/<image_id>/
    def destroy(self, request, product_id=None, pk=None):
        product = get_object_or_404(Product, id=product_id)
        product.image = None
        product.save()
        return Response({"status": "image deleted"}, status=200)

    # POST /products/<product_id>/images/<image_id>/set-primary/
    @action(detail=True, methods=["post"])
    def set_primary(self, request, product_id=None, pk=None):
        return Response({"status": "primary image set", "image_id": "primary"})



    