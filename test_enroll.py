import requests
import io
import time
from PIL import Image

def test_enrollment():
    base_url = "http://localhost:8000/enroll"
    
    # 1. Test zero faces
    print("Testing zero faces...")
    img0 = Image.new('RGB', (200, 200), color = 'red')
    buf0 = io.BytesIO()
    img0.save(buf0, format='JPEG')
    buf0.seek(0)
    
    res0 = requests.post(base_url, files={"image": ("zero.jpg", buf0, "image/jpeg")})
    print(f"Status Code (Zero faces): {res0.status_code}")
    print(f"Response: {res0.text}")
    
    # 2. Test multiple faces
    print("\nTesting multiple faces...")
    multi_url = "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/two_people.jpg"
    multi_res = requests.get(multi_url)
    
    if multi_res.status_code == 200:
        buf_multi = io.BytesIO(multi_res.content)
        res_multi = requests.post(base_url, files={"image": ("two_people.jpg", buf_multi, "image/jpeg")})
        print(f"Status Code (Multi faces): {res_multi.status_code}")
        print(f"Response: {res_multi.text}")
    else:
        print("Failed to download multiple face image.")

    # 3. Test single face to get benchmark time
    print("\nTesting single face...")
    single_url = "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/biden.jpg"
    single_res = requests.get(single_url)
    if single_res.status_code == 200:
        buf_single = io.BytesIO(single_res.content)
        start_time = time.time()
        res_single = requests.post(base_url, files={"image": ("biden.jpg", buf_single, "image/jpeg")})
        end_time = time.time()
        print(f"Status Code (Single face): {res_single.status_code}")
        print(f"Response: {res_single.text}")
        print(f"Elapsed Time: {(end_time - start_time) * 1000:.0f}ms")

if __name__ == "__main__":
    test_enrollment()
