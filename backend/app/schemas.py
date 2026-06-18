from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import re

# Product Schemas
class ProductBase(BaseModel):
    sku: str = Field(..., description="Unique product SKU")
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    stock_quantity: int = Field(..., ge=0)

class ProductCreate(ProductBase):
    @field_validator("sku")
    @classmethod
    def validate_sku(cls, v: str) -> str:
        if not re.match(r"^[A-Za-z0-9\-_]+$", v):
            raise ValueError("SKU must contain only letters, numbers, hyphens, and underscores (no spaces)")
        return v.upper().strip()

class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, description="Unique product SKU")
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0)
    stock_quantity: Optional[int] = Field(None, ge=0)

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not re.match(r"^[A-Za-z0-9\-_]+$", v):
            raise ValueError("SKU must contain only letters, numbers, hyphens, and underscores (no spaces)")
        return v.upper().strip()

class ProductResponse(ProductBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Customer Schemas
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr = Field(..., description="Unique customer email")
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return digits

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return digits

class CustomerResponse(CustomerBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# OrderItem Schemas
class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)

class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Decimal
    product_name: Optional[str] = None
    product_sku: Optional[str] = None

    class Config:
        from_attributes = True


# Order Schemas
class OrderCreate(BaseModel):
    customer_id: UUID
    items: List[OrderItemCreate]

class OrderUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|cancelled)$")

class OrderResponse(BaseModel):
    id: UUID
    customer_id: UUID
    status: str
    total_amount: Decimal
    created_at: datetime
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True


# Dashboard Statistics Schema
class DashboardStats(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_products_count: int
    total_revenue: Decimal
