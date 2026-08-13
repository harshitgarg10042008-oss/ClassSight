# Stage 21 — Isolated RTSP Capture Spike

## Scope

This is an isolated camera transport spike. It does not add camera entities, admin UI, attendance integration, or recognition changes.

## Environment and workaround

No real IP camera is available in the sandbox. FFmpeg was available, but its `-rtsp_flags listen` output failed to bind a usable local RTSP endpoint; the capture client received `Connection refused`. The environment did have GStreamer’s RTSP server packages available, so the spike used a local GStreamer RTSP relay serving a real `videotestsrc` test pattern. This is a simulated RTSP source, not a claim of real camera connectivity.

Server script: `run_rtsp_server.py`.

Stream URL during the test: `rtsp://127.0.0.1:8554/classsight`.

## Live capture evidence

The GStreamer server printed:

```text
RTSP_READY=rtsp://127.0.0.1:8554/classsight
```

FFmpeg connected over RTSP/TCP and wrote three independent JPEG frames. The server became ready approximately **106.84 ms** after process start. The capture command completed in approximately **5,986.47 ms** for three frames, including RTSP connection setup and frame retrieval. This is a coarse process-level latency measurement; the attempted finer-grained polling run was interrupted by shell job-control behavior and is not treated as evidence.

| Frame | Dimensions | Mode | Size |
|---|---:|---|---:|
| `frame-01.jpg` | 640 × 360 | RGB | 16,749 bytes |
| `frame-02.jpg` | 640 × 360 | RGB | 19,943 bytes |
| `frame-03.jpg` | 640 × 360 | RGB | 19,919 bytes |

All three files were opened and decoded successfully with Pillow. The first two were visually inspected and showed different SMPTE test-pattern frames, confirming that the stream produced consecutive frames rather than a copied file.

SHA-256 values:

```text
fbdea8127aca493afd65233915891d57e213863cebc12a3650fddae4da5634e4  frame-01.jpg
1938773abed9eb2c17dcde4d0eb6602f041d279d795f792ad32f9a94de41453e  frame-02.jpg
0ea6ee5ba7ecee01adf091d63c5747e95c8e15290c411ea63586346f9de36bba  frame-03.jpg
```

## Decision

**Stage 21 succeeded for a simulated RTSP source.** A real IP camera was not tested. The GStreamer workaround and the measured frame properties are sufficient to proceed to Stage 22’s camera entity and admin-management work, while keeping the simulated-source limitation explicit.
