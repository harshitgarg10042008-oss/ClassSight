FROM python:3.11-slim

# Install system dependencies for opencv-headless and facenet-pytorch (torch CPU)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgomp1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# torch+torchvision are large; install them before copying requirements.txt so layer is cached independently
RUN pip install --no-cache-dir torch==2.1.2 torchvision==0.16.2 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --no-deps facenet-pytorch
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the Haar Cascade XML from OpenCV's data (bundled with opencv-python-headless)
# and the FaceNet pretrained weights at build time so the container starts fast
RUN python -c "\
import cv2, os; \
cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'; \
assert os.path.exists(cascade_path), f'Cascade not found at {cascade_path}'; \
print('Haar Cascade OK:', cascade_path)"

# Pre-download FaceNet weights (InceptionResnetV1, pretrained=vggface2, 128-d)
RUN python -c "\
from facenet_pytorch import InceptionResnetV1; \
model = InceptionResnetV1(pretrained='vggface2', classify=False); \
model.eval(); \
print('FaceNet pretrained weights downloaded OK')"

COPY main.py .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
