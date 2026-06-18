import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import uuid

from app.main import app
from app.database import Base, get_db
from app import models

# In-memory SQLite configuration for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def init_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_product_success():
    payload = {
        "sku": "PROD-1001",
        "name": "Wireless Mouse",
        "description": "Ergonomic 2.4GHz mouse",
        "price": 29.99,
        "stock_quantity": 50
    }
    response = client.post("/products/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["sku"] == payload["sku"]
    assert data["name"] == payload["name"]
    assert float(data["price"]) == payload["price"]
    assert data["stock_quantity"] == payload["stock_quantity"]
    assert "id" in data


def test_create_product_duplicate_sku_fails():
    payload = {
        "sku": "PROD-DUP",
        "name": "Original Product",
        "price": 10.00,
        "stock_quantity": 10
    }
    # First creation succeeds
    resp1 = client.post("/products/", json=payload)
    assert resp1.status_code == 201
    
    # Second creation with same SKU should fail
    payload["name"] = "Duplicate Product"
    resp2 = client.post("/products/", json=payload)
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"]


def test_create_customer_success():
    payload = {
        "name": "Alice Smith",
        "email": "alice@example.com",
        "phone": "9876543210",
        "address": "123 Main St, Springfield"
    }
    response = client.post("/customers/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["email"] == payload["email"]
    assert "id" in data


def test_create_customer_duplicate_email_fails():
    payload = {
        "name": "Bob Jones",
        "email": "bob@example.com"
    }
    resp1 = client.post("/customers/", json=payload)
    assert resp1.status_code == 201

    payload["name"] = "Bob Duplicate"
    resp2 = client.post("/customers/", json=payload)
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"]


def test_place_order_success_and_stock_reduced():
    # 1. Create a Product
    prod_payload = {
        "sku": "ITEM-101",
        "name": "Keycap Set",
        "price": 45.00,
        "stock_quantity": 10
    }
    prod_resp = client.post("/products/", json=prod_payload)
    product_id = prod_resp.json()["id"]

    # 2. Create a Customer
    cust_payload = {
        "name": "Charlie",
        "email": "charlie@example.com"
    }
    cust_resp = client.post("/customers/", json=cust_payload)
    customer_id = cust_resp.json()["id"]

    # 3. Place Order for 3 units
    order_payload = {
        "customer_id": customer_id,
        "items": [
            {
                "product_id": product_id,
                "quantity": 3
            }
        ]
    }
    order_resp = client.post("/orders/", json=order_payload)
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    assert order_data["status"] == "confirmed"
    assert float(order_data["total_amount"]) == 135.00  # 45.00 * 3
    assert len(order_data["items"]) == 1
    assert order_data["items"][0]["quantity"] == 3

    # 4. Verify Product Stock is now 7
    verify_resp = client.get(f"/products/{product_id}")
    assert verify_resp.json()["stock_quantity"] == 7


def test_place_order_insufficient_stock_fails():
    # 1. Create a Product with stock of 2
    prod_payload = {
        "sku": "LIMITED-1",
        "name": "Rare Figurine",
        "price": 120.00,
        "stock_quantity": 2
    }
    prod_resp = client.post("/products/", json=prod_payload)
    product_id = prod_resp.json()["id"]

    # 2. Create a Customer
    cust_payload = {
        "name": "Daisy",
        "email": "daisy@example.com"
    }
    cust_resp = client.post("/customers/", json=cust_payload)
    customer_id = cust_resp.json()["id"]

    # 3. Place Order for 3 units (exceeds stock of 2)
    order_payload = {
        "customer_id": customer_id,
        "items": [
            {
                "product_id": product_id,
                "quantity": 3
            }
        ]
    }
    order_resp = client.post("/orders/", json=order_payload)
    assert order_resp.status_code == 400
    assert "Insufficient stock" in order_resp.json()["detail"]

    # 4. Verify Product Stock remains 2
    verify_resp = client.get(f"/products/{product_id}")
    assert verify_resp.json()["stock_quantity"] == 2


def test_cancel_order_restocks_inventory():
    # 1. Setup Product and Customer
    prod_resp = client.post("/products/", json={"sku": "RESTOCK-1", "name": "USB Cable", "price": 5.00, "stock_quantity": 10})
    product_id = prod_resp.json()["id"]
    cust_resp = client.post("/customers/", json={"name": "Ethan", "email": "ethan@example.com"})
    customer_id = cust_resp.json()["id"]

    # 2. Place Order for 4 units (stock goes from 10 -> 6)
    order_resp = client.post("/orders/", json={
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 4}]
    })
    order_id = order_resp.json()["id"]
    
    prod_after_order = client.get(f"/products/{product_id}").json()
    assert prod_after_order["stock_quantity"] == 6

    # 3. Cancel the Order
    cancel_resp = client.patch(f"/orders/{order_id}/status", json={"status": "cancelled"})
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # 4. Verify Product Stock is restored back to 10
    prod_after_cancel = client.get(f"/products/{product_id}").json()
    assert prod_after_cancel["stock_quantity"] == 10
