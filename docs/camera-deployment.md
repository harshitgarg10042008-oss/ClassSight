# Camera deployment

ClassSight uses a camera-agnostic adapter boundary. For a real camera, an administrator creates or updates a camera record with an `rtsp://` stream URL, assigns it to a room, and verifies it with `POST /admin/cameras/{id}/test-connection`. Browser capture uses the multipart `/capture` flow, while camera capture uses `/capture/from-camera`; the Spring adapter invokes FFmpeg to read one frame, stores the frame under the configured capture directory, and sends it through the normal recognition and review pipeline.

The camera stream URL must use RTSP and must not resolve to localhost, loopback, private/site-local, link-local, multicast, or cloud-metadata addresses. Credentials are encrypted before persistence. Configure the camera credential key through `classsight.camera.credential-key` and follow the manual rotation procedure in [docs/security.md](security.md) before changing it.

A real deployment should provide network reachability from the Spring host to the camera, confirm the camera’s RTSP transport and authentication mode, configure a stable room/camera assignment, and test packet loss, camera restart, and network outage behavior. The current verification used a local GStreamer-generated simulated RTSP stream only. It did not use a real IP camera, ONVIF discovery, vendor-specific authentication, or an actual network outage.
