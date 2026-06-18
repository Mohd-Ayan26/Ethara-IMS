from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from .. import schemas, crud
from ..database import get_db

router = APIRouter(
    prefix="/customers",
    tags=["customers"]
)

@router.get("/", response_model=List[schemas.CustomerResponse])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_customers(db, skip=skip, limit=limit)

@router.get("/{customer_id}", response_model=schemas.CustomerResponse)
def read_customer(customer_id: UUID, db: Session = Depends(get_db)):
    db_customer = crud.get_customer(db, customer_id=customer_id)
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return db_customer

@router.post("/", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    return crud.create_customer(db=db, customer_in=customer)

@router.put("/{customer_id}", response_model=schemas.CustomerResponse)
def update_customer(customer_id: UUID, customer: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    return crud.update_customer(db=db, customer_id=customer_id, customer_in=customer)

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: UUID, db: Session = Depends(get_db)):
    crud.delete_customer(db=db, customer_id=customer_id)
    return None
