from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging

from .config import settings
from .database import engine, Base, get_db
from .routers import products, customers, orders
from . import crud, schemas

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app")

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.error(f"Error during schema initialization: {e}", exc_info=True)

app = FastAPI(
    title="Ethara Inventory System API",
    description="Python FastAPI backend for managing products, customers, and orders atomically.",
    version="1.0.0"
)

# Global Exception Interceptors
@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database exception captured on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Database service is temporarily unavailable. Please try again later."}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please contact the administrator."}
    )

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register sub-routers
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)

# Health Check endpoint
@app.get("/health", tags=["system"])
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }

# Dashboard Aggregator endpoint
@app.get("/stats", response_model=schemas.DashboardStats, tags=["system"])
def get_stats(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
