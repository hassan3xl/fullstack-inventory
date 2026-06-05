#!/bin/bash
# Script to run the testing backend server with gunicorn on port 5000
# using settings from src.settings.testing

export DJANGO_SETTINGS_MODULE=src.settings.testing
export PORT=5000

# Ensure migrations are applied first (optional but highly recommended for testing)
echo "Applying database migrations for testing environment..."
if command -v uv >/dev/null 2>&1; then
    uv run python manage.py migrate --noinput
elif [ -f ".venv/bin/python" ]; then
    .venv/bin/python manage.py migrate --noinput
else
    python manage.py migrate --noinput
fi

echo "Starting Gunicorn server on port $PORT (environment: $DJANGO_SETTINGS_MODULE)..."
if command -v uv >/dev/null 2>&1; then
    exec uv run gunicorn src.wsgi:application \
        --bind 0.0.0.0:$PORT \
        --workers 2 \
        --reload
else
    if [ -f ".venv/bin/gunicorn" ]; then
        exec .venv/bin/gunicorn src.wsgi:application \
            --bind 0.0.0.0:$PORT \
            --workers 2 \
            --reload
    else
        exec gunicorn src.wsgi:application \
            --bind 0.0.0.0:$PORT \
            --workers 2 \
            --reload
    fi
fi
