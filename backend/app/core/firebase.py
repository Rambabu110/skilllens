import os
from google.oauth2 import id_token
from google.auth.transport import requests
from app.core.config import settings

_request = requests.Request()


def verify_firebase_id_token(token: str) -> dict:
    """
    Verifies the Firebase ID token's cryptographic signature directly against
    Google's public RSA certificates (https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com).
    Validates audience, issuer, and expiration.
    Requires NO service account credentials and NO Application Default Credentials (ADC).
    """
    project_id = getattr(settings, "FIREBASE_PROJECT_ID", None) or os.getenv("FIREBASE_PROJECT_ID", "skilllenss")
    decoded = id_token.verify_firebase_token(token, _request, audience=project_id)
    return decoded
