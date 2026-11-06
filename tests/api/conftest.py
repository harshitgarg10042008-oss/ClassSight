import os
import pytest
import requests


BACKEND = os.getenv("CLASSSIGHT_BACKEND_URL", "http://localhost:8080")


@pytest.fixture(scope="session")
def backend_url():
    return BACKEND


@pytest.fixture(scope="session")
def auth_headers(backend_url):
    response = requests.post(
        f"{backend_url}/auth/login",
        json={"usernameOrEmail": os.getenv("CLASSSIGHT_USER", "teacher"),
              "password": os.getenv("CLASSSIGHT_PASSWORD", "teacher123")},
        timeout=30,
    )
    response.raise_for_status()
    return {"Authorization": f"Bearer {response.json()['token']}"}
