"""
DJANGO_ENV configuration module for Django settings.
Handles loading and parsing DJANGO_ENV variables with proper defaults.
"""
from dotenv import load_dotenv
import os
from pathlib import Path

# 1. Resolve .env file location
# This finds the .env in the backend directory regardless of where you run the project from.
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / '.env'

# 2. Load DJANGO_ENV variables
load_dotenv(dotenv_path=env_path, override=True)

DJANGO_ENV = os.getenv("DJANGO_ENV", "development").lower()   
DJANGO_SETTINGS_MODULE = os.getenv("DJANGO_SETTINGS_MODULE")

# 4. Database 
LOCAL_DB = os.getenv("LOCAL_DB")
PRODUCTION_DB = os.getenv("PRODUCTION_DB")
DEVELOPMENT_DB = os.getenv("DEVELOPMENT_DB")

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=os.getenv("GOOGLE_OAUTH_CLIENT_ID")
GOOGLE_OAUTH_CLIENT_SECRET=os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")

# 5. Core Application Settings
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# 6. Third Party Integrations
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")

# Load and parse ALLOWED_ORIGINS
DEBUG = os.getenv("DEBUG", "False")

ALLOWED_HOSTS = (
    os.getenv("ALLOWED_HOSTS") or "localhost,127.0.0.1"
).split(",")
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS if host.strip()]
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if origin.strip()]
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "").split(",") if origin.strip()]

CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS", ""
).split(",")