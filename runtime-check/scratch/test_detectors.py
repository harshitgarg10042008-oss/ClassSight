import requests, json, os

with open('runtime-check/split_manifest.json') as f:
    m = json.load(f)
p = m['calibration_identities'][0]
p_dir = os.path.join(r'C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled', p)
img_path = os.path.join(p_dir, os.listdir(p_dir)[0])
for det in ['haar', 'yunet', 'mtcnn']:
    with open(img_path, 'rb') as f_img:
        r = requests.post('http://localhost:8000/detect-faces', params={'detector': det}, files={'image': ('face.jpg', f_img, 'image/jpeg')})
        data = r.json()
        print(f"{det}: status={r.status_code}, count={data.get('face_count')}, box={data.get('faces', [{}])[0].get('box')}, time={data.get('timings', {}).get('detection_ms')}ms")
