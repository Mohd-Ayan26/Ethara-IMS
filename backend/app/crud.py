from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from uuid import UUID
from decimal import Decimal
import logging

from . import models, schemas

logger = logging.getLogger(__name__)

# --- Product CRUD ---
def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).order_by(models.Product.sku).offset(skip).limit(limit).all()

def get_product(db: Session, product_id: UUID):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def create_product(db: Session, product_in: schemas.ProductCreate):
    # Check for unique SKU
    existing = get_product_by_sku(db, product_in.sku)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with SKU '{product_in.sku}' already exists."
        )
    db_product = models.Product(**product_in.model_dump())
    db.add(db_product)
    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with SKU '{product_in.sku}' already exists (database integrity constraint)."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating product: {str(e)}"
        )

def update_product(db: Session, product_id: UUID, product_in: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = product_in.model_dump(exclude_unset=True)
    
    # If updating SKU, ensure uniqueness
    if "sku" in update_data and update_data["sku"] != db_product.sku:
        existing = get_product_by_sku(db, update_data["sku"])
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{update_data['sku']}' already exists."
            )

    for field, value in update_data.items():
        setattr(db_product, field, value)
    
    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

def delete_product(db: Session, product_id: UUID):
    db_product = get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    # Check if product is in any orders
    in_orders = db.query(models.OrderItem).filter(models.OrderItem.product_id == product_id).first()
    if in_orders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete product. It is linked to existing orders. Decrease stock to 0 instead."
        )
        
    db.delete(db_product)
    try:
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- Customer CRUD ---
def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).order_by(models.Customer.name).offset(skip).limit(limit).all()

def get_customer(db: Session, customer_id: UUID):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()

def create_customer(db: Session, customer_in: schemas.CustomerCreate):
    existing = get_customer_by_email(db, customer_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Customer with email '{customer_in.email}' already exists."
        )
    db_customer = models.Customer(**customer_in.model_dump())
    db.add(db_customer)
    try:
        db.commit()
        db.refresh(db_customer)
        return db_customer
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Customer with email '{customer_in.email}' already exists (database integrity constraint)."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

def update_customer(db: Session, customer_id: UUID, customer_in: schemas.CustomerUpdate):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    update_data = customer_in.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"] != db_customer.email:
        existing = get_customer_by_email(db, update_data["email"])
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Customer with email '{update_data['email']}' already exists."
            )

    for field, value in update_data.items():
        setattr(db_customer, field, value)

    try:
        db.commit()
        db.refresh(db_customer)
        return db_customer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

def delete_customer(db: Session, customer_id: UUID):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    # Check for linked orders
    in_orders = db.query(models.Order).filter(models.Order.customer_id == customer_id).first()
    if in_orders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete customer. They have placed orders in the system."
        )

    db.delete(db_customer)
    try:
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- Order CRUD with Stock Reduction & Pessimistic Locking ---
def create_order(db: Session, order_in: schemas.OrderCreate):
    # Verify Customer exists
    customer = get_customer(db, order_in.customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    if not order_in.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must contain at least one item")

    # Sort items by product_id to prevent database deadlocks under high concurrency
    sorted_items = sorted(order_in.items, key=lambda x: x.product_id)
    
    # Extract unique product IDs
    product_ids = list(set([item.product_id for item in sorted_items]))

    try:
        # 1. Lock Product Rows using SELECT ... FOR UPDATE
        # This blocks concurrent writes to these products until this transaction commits/rolls back.
        products_locked = db.query(models.Product).filter(
            models.Product.id.in_(product_ids)
        ).with_for_update().all()

        product_map = {p.id: p for p in products_locked}
        
        # Verify all products exist
        for pid in product_ids:
            if pid not in product_map:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {pid} does not exist"
                )

        total_amount = Decimal("0.00")
        order_items_to_create = []

        # 2. Check and reduce stock
        for item in sorted_items:
            product = product_map[item.product_id]
            
            # Check availability
            if product.stock_quantity < item.quantity:
                # If insufficient, raise HTTPException to trigger transaction rollback
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for product SKU '{product.sku}' ({product.name}). Requested: {item.quantity}, Available: {product.stock_quantity}"
                )
            
            # Decrement inventory stock
            product.stock_quantity -= item.quantity
            item_total = product.price * item.quantity
            total_amount += item_total

            order_items_to_create.append(
                models.OrderItem(
                    product_id=product.id,
                    quantity=item.quantity,
                    unit_price=product.price
                )
            )

        # 3. Create the Main Order record
        db_order = models.Order(
            customer_id=order_in.customer_id,
            status="confirmed",  # Orders are automatically confirmed once stock is reserved successfully
            total_amount=total_amount
        )
        db.add(db_order)
        db.flush()  # Flushes changes to database to populate db_order.id

        # 4. Attach OrderItems
        for order_item in order_items_to_create:
            order_item.order_id = db_order.id
            db.add(order_item)

        # 5. Commit transaction
        db.commit()
        db.refresh(db_order)
        return db_order

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction failed during order placement: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to place order: {str(e)}"
        )

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def get_order(db: Session, order_id: UUID):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def update_order_status(db: Session, order_id: UUID, status_in: schemas.OrderUpdateStatus):
    db_order = get_order(db, order_id)
    if not db_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    old_status = db_order.status
    new_status = status_in.status

    if old_status == new_status:
        return db_order

    try:
        # Sort items to lock products safely
        sorted_items = sorted(db_order.items, key=lambda x: x.product_id)
        product_ids = [item.product_id for item in sorted_items]

        # Lock product records
        products_locked = db.query(models.Product).filter(
            models.Product.id.in_(product_ids)
        ).with_for_update().all()
        product_map = {p.id: p for p in products_locked}

        # Handle Stock Restocking on cancellation
        if new_status == "cancelled" and old_status in ("pending", "confirmed"):
            for item in sorted_items:
                product = product_map.get(item.product_id)
                if product:
                    product.stock_quantity += item.quantity
                    
        # Handle Stock reduction if re-confirming a cancelled order
        elif old_status == "cancelled" and new_status in ("pending", "confirmed"):
            for item in sorted_items:
                product = product_map.get(item.product_id)
                if not product or product.stock_quantity < item.quantity:
                    sku_str = product.sku if product else "Unknown SKU"
                    stock_avail = product.stock_quantity if product else 0
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot restore order. Insufficient stock for product SKU '{sku_str}'. Requested: {item.quantity}, Available: {stock_avail}"
                    )
                product.stock_quantity -= item.quantity

        db_order.status = new_status
        db.commit()
        db.refresh(db_order)
        return db_order

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- Statistics Aggregator ---
def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    total_products = db.query(func.count(models.Product.id)).scalar() or 0
    total_customers = db.query(func.count(models.Customer.id)).scalar() or 0
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    
    # Low stock: items with <= 5 stock quantity
    low_stock_count = db.query(func.count(models.Product.id)).filter(
        models.Product.stock_quantity <= 5
    ).scalar() or 0

    # Total revenue: Sum of confirmed or pending order amounts
    revenue = db.query(func.sum(models.Order.total_amount)).filter(
        models.Order.status != "cancelled"
    ).scalar() or Decimal("0.00")

    return schemas.DashboardStats(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_products_count=low_stock_count,
        total_revenue=Decimal(str(revenue))
    )
