from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import Learner

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_learner(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Learner:
    email = decode_access_token(token)
    if email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    learner = db.query(Learner).filter(Learner.email == email).first()
    if learner is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Learner not found")
    return learner


def get_current_admin(current: Learner = Depends(get_current_learner)) -> Learner:
    if not current.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current
