import requests


def test_backend_health(backend_url):
    response = requests.get(f"{backend_url}/actuator/health", timeout=30)
    assert response.status_code == 200


def test_face_service_pipeline(backend_url):
    response = requests.get("http://localhost:8000/health", timeout=30)
    assert response.status_code == 200
    body = response.json()
    assert body["detector"] == "mtcnn"
    assert body["distance_metric"] == "manhattan_L1"


def test_authenticated_assignments_and_roster(backend_url, auth_headers):
    assignments = requests.get(f"{backend_url}/teacher/assignments", headers=auth_headers, timeout=30)
    roster = requests.get(f"{backend_url}/students", headers=auth_headers, timeout=30)
    assert assignments.status_code == 200
    assert roster.status_code == 200
    assert all(item.get("rollNumber") for item in roster.json())
