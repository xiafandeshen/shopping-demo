from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Address, User
from app.schemas import AddressCreate, AddressResponse

router = APIRouter(prefix="/api/addresses", tags=["addresses"])


@router.get("", response_model=list[AddressResponse])
def list_addresses(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Address]:
    return list(
        db.scalars(
            select(Address)
            .where(Address.user_id == user.id)
            .order_by(Address.is_default.desc(), Address.id)
        ).all()
    )


@router.post("", response_model=AddressResponse, status_code=201)
def create_address(
    payload: AddressCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Address:
    addresses = db.scalars(select(Address).where(Address.user_id == user.id)).all()
    should_be_default = payload.is_default or not addresses
    if should_be_default:
        for address in addresses:
            address.is_default = False

    address = Address(
        user_id=user.id, **payload.model_dump(exclude={"is_default"}), is_default=should_be_default
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return address
