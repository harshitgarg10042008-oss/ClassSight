#!/usr/bin/env python3
import gi

gi.require_version("Gst", "1.0")
gi.require_version("GstRtspServer", "1.0")
from gi.repository import Gst, GstRtspServer, GLib

Gst.init(None)
server = GstRtspServer.RTSPServer()
server.set_service("8554")
mounts = server.get_mount_points()
factory = GstRtspServer.RTSPMediaFactory()
factory.set_launch(
    "( videotestsrc is-live=true pattern=smpte "
    "! video/x-raw,width=640,height=360,framerate=5/1 "
    "! videoconvert ! x264enc tune=zerolatency speed-preset=ultrafast bitrate=500 key-int-max=5 "
    "! rtph264pay name=pay0 pt=96 )"
)
factory.set_shared(True)
mounts.add_factory("/classsight", factory)
server.attach(None)
print("RTSP_READY=rtsp://127.0.0.1:8554/classsight", flush=True)
GLib.MainLoop().run()
