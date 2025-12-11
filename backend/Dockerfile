# Dockerfile for Box Label OCR Backend
# Deploy to AWS App Runner or any container service

FROM python:3.10-slim

# Install system dependencies for OpenCV, OCR engines, and image processing
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for Pixeltable storage
RUN mkdir -p /app/data/pixeltable

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PIXELTABLE_HOME=/app/data/pixeltable

# Expose the FastAPI port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with uvicorn (production settings)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
