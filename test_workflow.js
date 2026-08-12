const BASE_URL = 'http://localhost:8080';

async function runTest() {
    console.log("1. Logging in as teacher...");
    let token = null;
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernameOrEmail: 'teacher', password: 'teacher123' })
        });
        const loginText = await loginRes.text();
        console.log("   Login Response Status:", loginRes.status);
        console.log("   Login Response Body:", loginText);
        const loginData = JSON.parse(loginText);
        token = loginData.token;
        if (!token) {
            console.error("   Failed to obtain token.");
            return;
        }
    } catch (e) {
        console.error("   Error during login:", e);
        return;
    }

    console.log("\n2. Calling /capture with dummy image and metadata...");
    const dummyImageB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const dummyImageBuf = Buffer.from(dummyImageB64, 'base64');
    const blob = new Blob([dummyImageBuf], { type: 'image/png' });
    
    const formData = new FormData();
    formData.append('image', blob, 'dummy.png');
    formData.append('roomId', '1');
    formData.append('cameraId', '3');
    formData.append('assignmentId', '1');
    
    let sessionId = null;
    try {
        const captureRes = await fetch(`${BASE_URL}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const captureText = await captureRes.text();
        console.log(`   Capture Response Status: ${captureRes.status}`);
        console.log("   Capture Response Body:", captureText);
        
        const captureData = JSON.parse(captureText);
        sessionId = captureData.sessionId;
        if (!sessionId) {
            console.error("   Failed to extract sessionId.");
            return;
        }
    } catch (e) {
        console.error("   Error during /capture:", e);
        return;
    }
    
    console.log(`\n3. Calling /api/attendance-sessions/${sessionId}/status...`);
    try {
        const statusRes = await fetch(`${BASE_URL}/api/attendance-sessions/${sessionId}/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const statusText = await statusRes.text();
        console.log(`   Status Response Status: ${statusRes.status}`);
        console.log("   Status Response Body:", statusText);
        const statusData = JSON.parse(statusText);
        
        if (statusData.status === 'REVIEW_REQUIRED') {
            console.log("\n✅ SUCCESS: End-to-end workflow verified. Status is REVIEW_REQUIRED.");
        } else {
            console.error(`\n❌ FAILURE: Status is ${statusData.status}, expected REVIEW_REQUIRED.`);
        }
    } catch (e) {
        console.error("   Error during status check:", e);
    }
}

runTest();
