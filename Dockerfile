# Python base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# No additional system dependencies needed
# pandas and openpyxl provide wheels, no compilation required

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port (Railway provides $PORT)
ENV PORT 8000
EXPOSE $PORT

# Run the application
CMD ["python", "main.py"]
