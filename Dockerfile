FROM python:3.10-slim

# Mencegah penulisan bytecode .pyc dan memastikan output log ter-flush secara langsung
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependensi dengan --no-cache-dir untuk meminimalkan ukuran image
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh source code backend
COPY app/ /app/

EXPOSE 8000

# Command untuk menjalankan server FastAPI (Uvicorn dengan single worker / threadpool)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
