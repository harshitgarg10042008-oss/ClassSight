#!/usr/bin/env python3
"""
Part B.1: Verify embedding size and normalization
"""
import requests
import time
import json

FACE_SERVICE = "http://localhost:8000"
IMAGE_PATH = "C:/Users/vishe/OneDrive/Desktop/Goal/ClassSight/face-service-fastapi/tests/fixtures/obama_reference.jpg"

print("=" * 70)
print("PART B.1: Embedding Size and Normalization Check")
print("=" * 70)

# Test enrollment endpoint to get embedding
print(f"\nTesting enrollment on: {IMAGE_PATH}")
with open(IMAGE_PATH, 'rb') as f:
    files = {'image': f}
    start = time.time()
    response = requests.post(f"{FACE_SERVICE}/enroll", files=files)
    elapsed = (time.time() - start) * 1000

print(f"Status: {response.status_code}")
print(f"Time: {elapsed:.0f}ms")

if response.status_code == 200:
    data = response.json()
    embedding = data.get('embedding', [])
    print(f"\nEmbedding length: {len(embedding)}")
    print(f"First 5 values: {embedding[:5]}")
    print(f"Last 5 values: {embedding[-5:]}")

    # Check if L2-normalized
    import numpy as np
    emb_array = np.array(embedding)
    l2_norm = np.linalg.norm(emb_array)
    print(f"\nL2 norm: {l2_norm:.6f}")
    print(f"L2-normalized: {abs(l2_norm - 1.0) < 0.01}")

    # Check detector info from health endpoint
    health = requests.get(f"{FACE_SERVICE}/health").json()
    print(f"\nDetector: {health.get('detector')}")
    print(f"Embedder: {health.get('embedder')}")
    print(f"Distance metric: {health.get('distance_metric')}")
    print(f"Manhattan threshold: {health.get('manhattan_threshold')}")
else:
    print(f"Error: {response.text}")
