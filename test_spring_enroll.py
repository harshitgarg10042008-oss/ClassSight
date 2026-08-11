import requests
import io
from PIL import Image

def test_spring_enrollment():
    base_url = "http://localhost:8080/students/TEST001/enroll"
    
    # 1. Test zero faces
    print("Testing zero faces on Spring...")
    img0 = Image.new('RGB', (200, 200), color = 'red')
    buf0 = io.BytesIO()
    img0.save(buf0, format='JPEG')
    buf0.seek(0)
    
    res0 = requests.post(base_url, files={"photo": ("zero.jpg", buf0, "image/jpeg")})
    print(f"Status Code (Zero faces): {res0.status_code}")
    print(f"Response: {res0.text}")
    
    # 2. Test multiple faces
    print("\nTesting multiple faces on Spring...")
    multi_url = "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/two_people.jpg"
    multi_res = requests.get(multi_url)
    
    if multi_res.status_code == 200:
        buf_multi = io.BytesIO(multi_res.content)
        res_multi = requests.post(base_url, files={"photo": ("two_people.jpg", buf_multi, "image/jpeg")})
        print(f"Status Code (Multi faces): {res_multi.status_code}")
        print(f"Response: {res_multi.text}")
    else:
        print("Failed to download multiple face image.")

if __name__ == "__main__":
    test_spring_enrollment()
