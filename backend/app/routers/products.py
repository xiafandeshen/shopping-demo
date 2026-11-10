from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Product
from app.schemas import ProductDetailResponse, ProductPageResponse, ProductResponse

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/recommended", response_model=list[ProductResponse])
def get_recommended_products(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Product]:
    statement = (
        select(Product)
        .where(Product.is_active.is_(True))
        .order_by(Product.recommendation_score.desc(), Product.id.asc())
        .limit(limit)
    )
    return list(db.scalars(statement).all())


@router.get("", response_model=ProductPageResponse)
def search_products(
    q: str = Query(default="", max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ProductPageResponse:
    statement = select(Product).where(Product.is_active.is_(True))
    term = q.strip()
    if term:
        pattern = f"%{term}%"
        statement = statement.where(
            or_(
                Product.name.ilike(pattern),
                Product.brand.ilike(pattern),
                Product.category.ilike(pattern),
                Product.description.ilike(pattern),
            )
        )

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    products = db.scalars(
        statement.order_by(Product.recommendation_score.desc(), Product.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ProductPageResponse(items=products, page=page, page_size=page_size, total=total)


@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product(product_id: str, db: Session = Depends(get_db)) -> Product:
    product = db.scalar(
        select(Product)
        .options(selectinload(Product.reviews))
        .where(Product.id == product_id, Product.is_active.is_(True))
    )
    if product is None:
        raise HTTPException(status_code=404, detail="商品不存在")
    return product
