from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import face_recognition
import numpy as np
from PIL import Image
import io
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Service FastAPI")

class EmbeddingResponse(BaseModel):
    embedding: list[float]
    face_count: int
    message: str

@app.get("/health")
def health():
    return {"status": "UP", "service": "face-service-fastapi"}

@app.post("/enroll", response_model=EmbeddingResponse)
async def enroll(image: UploadFile = File(...)):
    try:
        # Read image bytes
        image_bytes = await image.read()
        
        # Load image using PIL
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Convert to numpy array for face_recognition
        image_array = np.array(pil_image)
        
        # Detect faces using HOG (CPU-friendly)
        face_locations = face_recognition.face_locations(image_array, model="hog")
        face_count = len(face_locations)
        
        # Validate face count
        if face_count == 0:
            raise HTTPException(status_code=400, detail="No face detected in the image")
        elif face_count > 1:
            raise HTTPException(status_code=400, detail=f"Multiple faces detected ({face_count}). Please provide an image with exactly one face.")
        
        # Generate face embedding
        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        
        if len(face_encodings) == 0:
            raise HTTPException(status_code=400, detail="Failed to generate face embedding")
        
        embedding = face_encodings[0].tolist()
        
        logger.info(f"Successfully generated embedding for image with {face_count} face(s)")
        
        return EmbeddingResponse(
            embedding=embedding,
            face_count=face_count,
            message="Face embedding generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing enrollment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error during enrollment: {str(e)}")
