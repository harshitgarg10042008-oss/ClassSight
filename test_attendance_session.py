#!/usr/bin/env python3
"""
Integration test for AttendanceSession workflow.
Tests the full flow: login → capture image → session creation → status verification.
"""

import requests
import json
from PIL import Image, ImageDraw
import io
import sys

# Configuration
BASE_URL = "http://localhost:8080"
LOGIN_URL = f"{BASE_URL}/auth/login"
CAPTURE_URL = f"{BASE_URL}/capture"
SESSION_STATUS_URL = f"{BASE_URL}/api/attendance-sessions"

def generate_dummy_image():
    """Generate a simple dummy image in-memory (no file dependency)."""
    img = Image.new('RGB', (640, 480), color='blue')
    draw = ImageDraw.Draw(img)
    draw.text((320, 240), "Test Capture", fill='white')
    
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    return img_buffer

def login_as_teacher():
    """Log in as teacher user and return JWT token."""
    print("\n=== Step 1: Login as teacher ===")
    payload = {
        "usernameOrEmail": "teacher",
        "password": "teacher123"
    }
    
    response = requests.post(LOGIN_URL, json=payload)
    print(f"Login Status: {response.status_code}")
    print(f"Login Response: {response.text}")
    
    if response.status_code != 200:
        print("ERROR: Login failed")
        sys.exit(1)
    
    data = response.json()
    token = data.get('token')
    if not token:
        print("ERROR: No token in response")
        sys.exit(1)
    
    print(f"JWT Token: {token[:50]}...")
    return token

def capture_image(token, room_id=1, camera_id=3, assignment_id=1):
    """Upload capture image and create AttendanceSession."""
    print("\n=== Step 2: Capture image and create session ===")
    
    img_buffer = generate_dummy_image()
    
    files = {
        'image': ('capture.jpg', img_buffer, 'image/jpeg')
    }
    data = {
        'roomId': str(room_id),
        'cameraId': str(camera_id),
        'assignmentId': str(assignment_id)
    }
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    response = requests.post(CAPTURE_URL, files=files, data=data, headers=headers)
    print(f"Capture Status: {response.status_code}")
    print(f"Capture Response: {response.text}")
    
    if response.status_code != 200:
        print("ERROR: Capture failed")
        sys.exit(1)
    
    result = response.json()
    session_id = result.get('sessionId')
    session_status = result.get('sessionStatus')
    
    if not session_id:
        print("ERROR: No sessionId in response")
        sys.exit(1)
    
    print(f"Session ID: {session_id}")
    print(f"Session Status: {session_status}")
    
    return session_id, session_status

def verify_session_status(token, session_id, expected_status="REVIEW_REQUIRED"):
    """Verify the session status via API."""
    print("\n=== Step 3: Verify session status ===")
    
    url = f"{SESSION_STATUS_URL}/{session_id}/status"
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    response = requests.get(url, headers=headers)
    print(f"Status Check Status: {response.status_code}")
    print(f"Status Check Response: {response.text}")
    
    if response.status_code != 200:
        print("ERROR: Status check failed")
        sys.exit(1)
    
    result = response.json()
    actual_status = result.get('status')
    
    print(f"Expected Status: {expected_status}")
    print(f"Actual Status: {actual_status}")
    
    if actual_status != expected_status:
        print(f"ERROR: Status mismatch. Expected {expected_status}, got {actual_status}")
        sys.exit(1)
    
    print("✓ Status verification passed!")
    return result

def main():
    print("=" * 60)
    print("AttendanceSession Workflow Integration Test")
    print("=" * 60)
    
    try:
        # Step 1: Login
        token = login_as_teacher()
        
        # Step 2: Capture image and create session
        session_id, session_status = capture_image(token)
        
        # Step 3: Verify session status
        session_details = verify_session_status(token, session_id)
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED")
        print("=" * 60)
        print(f"\nSession Details:")
        print(f"  Session ID: {session_details.get('sessionId')}")
        print(f"  Status: {session_details.get('status')}")
        print(f"  Faculty: {session_details.get('faculty')}")
        print(f"  Room: {session_details.get('room')}")
        print(f"  Subject: {session_details.get('subject')}")
        print(f"  Class Section: {session_details.get('classSection')}")
        print(f"  Started At: {session_details.get('startedAt')}")
        
    except Exception as e:
        print(f"\nERROR: Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
