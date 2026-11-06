import requests
import io
from PIL import Image

BASE_URL = "http://localhost:8080"

def test_spring_enrollment():
    login = requests.post(f"{BASE_URL}/auth/login", json={
        "usernameOrEmail": "teacher",
        "password": "teacher123",
    })
    login.raise_for_status()
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    base_url = f"{BASE_URL}/students/TEST001/enroll"
    
    # 1. Test zero faces
    print("Testing zero faces on Spring...")
    img0 = Image.new('RGB', (200, 200), color = 'red')
    buf0 = io.BytesIO()
    img0.save(buf0, format='JPEG')
    buf0.seek(0)
    
    res0 = requests.post(base_url, headers=headers, data={"consentGiven": "true"},
                         files={"photo": ("zero.jpg", buf0, "image/jpeg")})
    print(f"Status Code (Zero faces): {res0.status_code}")
    print(f"Response: {res0.text}")
    
    # 2. Test multiple faces
    print("\nTesting multiple faces on Spring...")
    multi_url = "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/two_people.jpg"
    multi_res = requests.get(multi_url)
    
    if multi_res.status_code == 200:
        buf_multi = io.BytesIO(multi_res.content)
        res_multi = requests.post(base_url, headers=headers, data={"consentGiven": "true"},
                                  files={"photo": ("two_people.jpg", buf_multi, "image/jpeg")})
        print(f"Status Code (Multi faces): {res_multi.status_code}")
        print(f"Response: {res_multi.text}")
    else:
        print("Failed to download multiple face image.")

if __name__ == "__main__":
    test_spring_enrollment()
