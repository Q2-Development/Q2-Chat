# backend/app/auth.py
import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

class JWTBearer(HTTPBearer):
    """
    Dependency that checks for a valid Supabase JWT (HS256) and returns the user ID.
    """
    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)
        self._secret = os.getenv("SUPABASE_JWT_SECRET")
        self._issuer = f"{os.getenv('SUPABASE_URL')}/auth/v1"

    async def __call__(self, credentials: HTTPAuthorizationCredentials = Security()):
        if not credentials or credentials.scheme.lower() != "bearer":
            raise HTTPException(status_code=403, detail="Auth credentials missing")
        token = credentials.credentials
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=["HS256"],
                audience="authenticated",
                issuer=self._issuer,
            )
            return payload.get("sub")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
