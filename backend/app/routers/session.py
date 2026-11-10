import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import LoginRequest, SessionResponse

router = APIRouter(prefix="/api/session", tags=["session"])


@router.post("/login", response_model=SessionResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.login_id == payload.login_id))
    if user is None:
        raise HTTPException(status_code=401, detail="演示账号不存在")

    user.session_token = secrets.token_urlsafe(32)
    db.commit()
    response.set_cookie(
        key="session_token",
        value=user.session_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 24,
    )
    return user


@router.get("/me", response_model=SessionResponse)
def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    user.session_token = None
    db.commit()
    response.status_code = status.HTTP_204_NO_CONTENT
    response.delete_cookie("session_token")
    return response
