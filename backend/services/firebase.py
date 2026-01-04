"""
Firebase Admin SDK Service for authentication.

Provides token verification and user management functionality.
Falls back to development mode if Firebase is not configured.
"""

import os
import logging
from typing import Optional, Dict, Any
from functools import lru_cache

logger = logging.getLogger(__name__)

# Track initialization state
_firebase_app = None
_firebase_initialized = False
_firebase_available = False


def _initialize_firebase() -> bool:
    """
    Initialize Firebase Admin SDK.

    Returns:
        bool: True if Firebase was successfully initialized, False otherwise.
    """
    global _firebase_app, _firebase_initialized, _firebase_available

    if _firebase_initialized:
        return _firebase_available

    _firebase_initialized = True

    # Check if Firebase is explicitly disabled via config
    try:
        from config import get_settings
        settings = get_settings()
        if not settings.firebase_enabled:
            logger.info(
                "Firebase disabled via FIREBASE_ENABLED=false. Running in development mode. "
                "Set FIREBASE_ENABLED=true and provide credentials to enable Firebase auth."
            )
            return False
    except Exception as e:
        logger.warning(f"Could not check Firebase config setting: {e}")

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Check for service account key file
        service_account_paths = [
            os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", ""),
            "serviceAccountKey.json",
            os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json"),
            "/app/serviceAccountKey.json",  # Docker path
        ]

        cred = None
        used_path = None

        for path in service_account_paths:
            if path and os.path.exists(path):
                try:
                    cred = credentials.Certificate(path)
                    used_path = path
                    break
                except Exception as e:
                    logger.warning(f"Failed to load credentials from {path}: {e}")

        if cred is None:
            # Try application default credentials (for Cloud environments)
            try:
                cred = credentials.ApplicationDefault()
                used_path = "Application Default Credentials"
            except Exception:
                logger.info(
                    "Firebase credentials not found. Running in development mode. "
                    "To enable Firebase auth, place serviceAccountKey.json in the backend directory "
                    "or set FIREBASE_SERVICE_ACCOUNT_PATH environment variable."
                )
                return False

        # Initialize Firebase app
        _firebase_app = firebase_admin.initialize_app(cred)
        _firebase_available = True
        logger.info(f"Firebase Admin SDK initialized successfully using: {used_path}")
        return True

    except ImportError:
        logger.warning(
            "firebase-admin package not installed. Running in development mode. "
            "Install with: pip install firebase-admin"
        )
        return False
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        return False


class FirebaseService:
    """
    Firebase Admin SDK service for token verification and user management.

    Provides graceful fallback to development mode when Firebase is not configured.
    """

    def __init__(self):
        """Initialize the Firebase service."""
        self._initialized = _initialize_firebase()

    @property
    def is_available(self) -> bool:
        """Check if Firebase is properly configured and available."""
        return self._initialized and _firebase_available

    async def verify_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Verify a Firebase ID token.

        Args:
            id_token: The Firebase ID token to verify.

        Returns:
            Dict containing the decoded token claims if valid, None otherwise.
            Claims include: uid, email, email_verified, name, etc.

        Raises:
            ValueError: If the token is invalid or expired.
        """
        if not self.is_available:
            logger.debug("Firebase not available, skipping token verification")
            return None

        try:
            from firebase_admin import auth

            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token

        except auth.InvalidIdTokenError as e:
            logger.warning(f"Invalid Firebase ID token: {e}")
            raise ValueError("Invalid authentication token")
        except auth.ExpiredIdTokenError as e:
            logger.warning(f"Expired Firebase ID token: {e}")
            raise ValueError("Authentication token has expired")
        except auth.RevokedIdTokenError as e:
            logger.warning(f"Revoked Firebase ID token: {e}")
            raise ValueError("Authentication token has been revoked")
        except auth.CertificateFetchError as e:
            logger.error(f"Failed to fetch Firebase certificates: {e}")
            raise ValueError("Authentication service temporarily unavailable")
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise ValueError("Authentication failed")

    async def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        """
        Get a Firebase user by UID.

        Args:
            uid: The Firebase user UID.

        Returns:
            Dict containing user info if found, None otherwise.
        """
        if not self.is_available:
            return None

        try:
            from firebase_admin import auth

            user = auth.get_user(uid)
            return {
                "uid": user.uid,
                "email": user.email,
                "email_verified": user.email_verified,
                "display_name": user.display_name,
                "photo_url": user.photo_url,
                "disabled": user.disabled,
                "provider_data": [
                    {
                        "provider_id": p.provider_id,
                        "uid": p.uid,
                        "email": p.email,
                    }
                    for p in user.provider_data
                ] if user.provider_data else [],
            }

        except auth.UserNotFoundError:
            logger.warning(f"Firebase user not found: {uid}")
            return None
        except Exception as e:
            logger.error(f"Failed to get Firebase user {uid}: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get a Firebase user by email.

        Args:
            email: The user's email address.

        Returns:
            Dict containing user info if found, None otherwise.
        """
        if not self.is_available:
            return None

        try:
            from firebase_admin import auth

            user = auth.get_user_by_email(email)
            return {
                "uid": user.uid,
                "email": user.email,
                "email_verified": user.email_verified,
                "display_name": user.display_name,
                "disabled": user.disabled,
            }

        except auth.UserNotFoundError:
            return None
        except Exception as e:
            logger.error(f"Failed to get Firebase user by email {email}: {e}")
            return None

    async def create_custom_token(self, uid: str, additional_claims: Optional[Dict] = None) -> Optional[str]:
        """
        Create a custom authentication token for a user.

        Args:
            uid: The UID to assign to the custom token.
            additional_claims: Optional additional claims to include.

        Returns:
            The custom token string if successful, None otherwise.
        """
        if not self.is_available:
            return None

        try:
            from firebase_admin import auth

            token = auth.create_custom_token(uid, additional_claims)
            return token.decode("utf-8") if isinstance(token, bytes) else token

        except Exception as e:
            logger.error(f"Failed to create custom token: {e}")
            return None


# Singleton instance
_firebase_service: Optional[FirebaseService] = None


def get_firebase_service() -> FirebaseService:
    """Get the singleton Firebase service instance."""
    global _firebase_service
    if _firebase_service is None:
        _firebase_service = FirebaseService()
    return _firebase_service


# Convenience function
firebase_service = get_firebase_service
