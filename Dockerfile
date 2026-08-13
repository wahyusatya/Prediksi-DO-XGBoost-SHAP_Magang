FROM python:3.10-slim

WORKDIR /app

# Install dependensi
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh source code
COPY app/ /app/

# Expose port 8000
EXPOSE 8000

# Command untuk menjalankan server FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
