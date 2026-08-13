#!/usr/bin/env python3
"""Detection-only edge spike; intentionally does not modify the production flow."""
import json
import os
import subprocess
from pathlib import Path
import requests
import face_recognition
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'edge-spike' / 'crops'
API = os.getenv('FACE_API', 'http://127.0.0.1:8000')
PHOTOS = [
    ROOT / 'face-service-fastapi/tests/fixtures/obama_biden_group_2010.jpg',
    ROOT / 'face-service-fastapi/tests/fixtures/classroom_wide_distant_faces.jpg',
    ROOT / 'golden-set/largegroup-1899/classroom_1899.jpg',
]

def students():
    supplied = os.getenv('EDGE_ENROLLED_JSON')
    if supplied:
        return json.loads(supplied)
    query = "select roll_number, array_to_string(face_embedding, ',') from students where face_embedding is not null order by id"
    env = dict(os.environ, PGPASSWORD='classsight_password')
    text = subprocess.check_output(['psql', '-h', '127.0.0.1', '-p', '5432', '-U', 'classsight', '-d', 'classsight', '-At', '-F', '\t', '-c', query], env=env, text=True)
    result=[]
    for index, line in enumerate(text.splitlines(), 1):
        roll, raw = line.split('\t', 1)
        result.append({'student_id': index, 'roll_number': roll, 'embedding': [float(value) for value in raw.split(',')]})
    return result

def recognize(path: Path, enrolled):
    with path.open('rb') as handle:
        response = requests.post(API + '/recognize', files={'image': (path.name, handle, 'image/jpeg')}, data={'enrolled_students': json.dumps(enrolled), 'distance_threshold': '0.6'}, timeout=180)
    response.raise_for_status()
    return response.json()

def main():
    enrolled = students(); OUT.mkdir(parents=True, exist_ok=True); report=[]
    for source in PHOTOS:
        image = Image.open(source).convert('RGB')
        locations = face_recognition.face_locations(face_recognition.load_image_file(source), model='hog')
        crop_dir = OUT / source.stem; crop_dir.mkdir(parents=True, exist_ok=True)
        crops=[]
        for index, (top, right, bottom, left) in enumerate(locations):
            height, width = image.height, image.width
            pad_y = int((bottom-top)*0.20); pad_x = int((right-left)*0.20)
            box=(max(0,left-pad_x), max(0,top-pad_y), min(width,right+pad_x), min(height,bottom+pad_y))
            crop=image.crop(box); path=crop_dir/f'face_{index:02d}.jpg'; crop.save(path, quality=92); crops.append(path)
        full = recognize(source, enrolled)
        crop_results = [recognize(path, enrolled) for path in crops]
        full_ids=[(m.get('student_id'), m.get('matched'), m.get('confidence_score'), m.get('distance')) for m in full.get('matches',[])]
        crop_ids=[[(m.get('student_id'),m.get('matched'),m.get('confidence_score'),m.get('distance')) for m in result.get('matches',[])] for result in crop_results]
        report.append({'source':str(source.relative_to(ROOT)), 'full_bytes':source.stat().st_size, 'face_count':len(locations), 'crop_bytes':sum(path.stat().st_size for path in crops), 'crop_paths':[str(path.relative_to(ROOT)) for path in crops], 'full_matches':full_ids, 'crop_matches':crop_ids, 'full_quality':full.get('quality')})
    output=ROOT/'docs/edge-spike/results.json'; output.write_text(json.dumps(report, indent=2)); print(json.dumps(report, indent=2)); print('RESULT_FILE', output)

if __name__ == '__main__': main()
