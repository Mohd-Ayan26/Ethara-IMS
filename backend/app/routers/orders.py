from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from .. import schemas, crud
from ..database import get_db

router = APIRouter(
    prefix="/orders",
    tags=["orders"]
)

@router.get("/", response_model=List[schemas.OrderResponse])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_orders(db, skip=skip, limit=limit)

@router.get("/{order_id}", response_model=schemas.OrderResponse)
def read_order(order_id: UUID, db: Session = Depends(get_db)):
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return db_order

@router.post("/", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    return crud.create_order(db=db, order_in=order)

@router.patch("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(order_id: UUID, status_update: schemas.OrderUpdateStatus, db: Session = Depends(get_db)):
    return crud.update_order_status(db=db, order_id=order_id, status_in=status_update)
