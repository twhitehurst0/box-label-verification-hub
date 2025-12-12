# Dockerfile for Box Label OCR Backend
# Deploy to AWS ECS Fargate or any container service
# Build from project root: docker build -f backend/Dockerfile .

FROM python:3.10-slim

# Install system dependencies for OpenCV, OCR engines, and image processing
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY backend/requirements.txt ./backend/
COPY OCR_scripts/requirements.txt ./OCR_scripts/

# Install Python dependencies from both requirements files
# Also uninstall uvloop to prevent conflict with Pixeltable's nest_asyncio
RUN pip install --no-cache-dir -r backend/requirements.txt && \
    pip install --no-cache-dir -r OCR_scripts/requirements.txt && \
    pip uninstall -y uvloop || true

# Copy application code - both backend and OCR_scripts
COPY backend/ ./backend/
COPY OCR_scripts/ ./OCR_scripts/

# Create data directory for Pixeltable storage
RUN mkdir -p /app/data/pixeltable

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONFAULTHANDLER=1
ENV PYTHONPATH=/app/backend:/app/OCR_scripts:/app
ENV PIXELTABLE_HOME=/app/data/pixeltable
# Prevent uvloop from being used - needed for Pixeltable compatibility
ENV UVLOOP_USE_LIBUV=0

# Working directory is the backend
WORKDIR /app/backend

# Expose the FastAPI port
EXPOSE 8000

# Health check with longer start period for ML model loading
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with uvicorn (production settings)
# Use --loop asyncio to avoid uvloop conflict with Pixeltable's nest_asyncio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--loop", "asyncio"]
