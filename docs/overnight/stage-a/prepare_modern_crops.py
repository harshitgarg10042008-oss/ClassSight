from pathlib import Path
import face_recognition
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
source = root / "source" / "modern_classroom_selfie.jpg"
image = face_recognition.load_image_file(source)
locations = face_recognition.face_locations(image, model="hog")
print(f"faces_detected={len(locations)}")
print("index,top,right,bottom,left")
for index, loc in enumerate(locations):
    print(index, *loc, sep=",")

pil = Image.open(source).convert("RGB")
width, height = pil.size
crops = []
for index, (top, right, bottom, left) in enumerate(locations):
    margin = max(20, int((bottom - top) * 0.35))
    x0 = max(0, left - margin)
    y0 = max(0, top - margin)
    x1 = min(width, right + margin)
    y1 = min(height, bottom + margin)
    crop = pil.crop((x0, y0, x1, y1))
    path = root / "modern-crops" / f"candidate_{index:02d}.jpg"
    path.parent.mkdir(parents=True, exist_ok=True)
    crop.save(path, quality=95)
    tile = crop.copy()
    tile.thumbnail((220, 180))
    crops.append((index, tile))

cols = 4
rows = (len(crops) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 260, max(1, rows) * 220), "white")
draw = ImageDraw.Draw(sheet)
for position, (index, tile) in enumerate(crops):
    x = (position % cols) * 260 + 20
    y = (position // cols) * 220 + 20
    sheet.paste(tile, (x, y))
    draw.text((x, y + 185), f"candidate {index}", fill="black")
sheet.save(root / "modern-contact-sheet.jpg", quality=95)
