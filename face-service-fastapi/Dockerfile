FROM python:3.11-slim

# System dependencies for OpenCV headless (Haar Cascade detector).
# dlib/cmake are no longer needed — replaced by opencv-python-headless + keras-facenet.
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the FaceNet pretrained weights so the container starts without
# needing external network access at runtime. keras-facenet downloads on first
# call to FaceNet() if the cache is missing; this RUN layer caches them.
RUN python -c "from keras_facenet import FaceNet; FaceNet()"

COPY main.py .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
