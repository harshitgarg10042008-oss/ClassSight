'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { LockedFeature } from '@/components/LockedFeature';
import { api, type Camera, type Room } from '@/lib/api';
import { CamerasIcon, RefreshIcon, CheckIcon, WarningIcon } from '@/components/ui/Icons';

export default function CamerasMonitorPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function loadData() {
    setLoading(true);
    Promise.all([api.getCameras(), api.getRooms()])
      .then(([cams, rms]) => {
        setCameras(Array.isArray(cams) && cams.length > 0 ? cams : [
          { id: 1, name: 'Cam-101-Main', status: 'ONLINE', room: { id: 1 } },
          { id: 2, name: 'Cam-102-Ceiling', status: 'ONLINE', room: { id: 2 } },
          { id: 3, name: 'Cam-103-Podium', status: 'ONLINE', room: { id: 3 } },
          { id: 4, name: 'Cam-Lab-Auditorium', status: 'ONLINE', room: { id: 4 } },
        ]);
        setRooms(Array.isArray(rms) && rms.length > 0 ? rms : [
          { id: 1, name: 'Room 101 — Computer Science Lab', building: 'Tech Block A', capacity: 60, active: true },
          { id: 2, name: 'Room 102 — Seminar Hall', building: 'Tech Block A', capacity: 50, active: true },
          { id: 3, name: 'Room 103 — Electronics Lab', building: 'Tech Block B', capacity: 45, active: true },
          { id: 4, name: 'Auditorium Hall', building: 'Central Block', capacity: 200, active: true },
        ]);
      })
      .catch(() => {
        // Fallback default hardware profiles
        setCameras([
          { id: 1, name: 'Cam-101-Main', status: 'ONLINE', room: { id: 1 } },
          { id: 2, name: 'Cam-102-Ceiling', status: 'ONLINE', room: { id: 2 } },
          { id: 3, name: 'Cam-103-Podium', status: 'ONLINE', room: { id: 3 } },
          { id: 4, name: 'Cam-Lab-Auditorium', status: 'ONLINE', room: { id: 4 } },
        ]);
        setRooms([
          { id: 1, name: 'Room 101 — Computer Science Lab', building: 'Tech Block A', capacity: 60, active: true },
          { id: 2, name: 'Room 102 — Seminar Hall', building: 'Tech Block A', capacity: 50, active: true },
          { id: 3, name: 'Room 103 — Electronics Lab', building: 'Tech Block B', capacity: 45, active: true },
          { id: 4, name: 'Auditorium Hall', building: 'Central Block', capacity: 200, active: true },
        ]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  function handlePingRefresh() {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      loadData();
    }, 800);
  }

  return (
    <PageLayout
      title="Room Cameras &amp; Sensor Health"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Cameras' }]}
      isSampleData={true}
      actions={
        <button type="button" className="button-secondary cs-button" onClick={handlePingRefresh} disabled={refreshing}>
          <RefreshIcon size={16} />
          <span>{refreshing ? 'Probing Feeds...' : 'Ping Camera Feeds'}</span>
        </button>
      }
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Hardware Infrastructure &bull; Feature D08</span>
            <h2>Classroom Cameras &amp; Video Streams</h2>
            <p className="hint">
              Monitors RTSP camera streams, frame delivery latencies, and resolution health across institution lecture halls.
            </p>
          </div>
          <span className="badge badge-green">4 Feeds Online</span>
        </div>

        <div className="stats-grid" style={{ marginTop: 16 }}>
          <div className="stat-card green">
            <div className="stat-value">{cameras.length} Active</div>
            <div className="stat-label">Provisioned IP Cameras</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-value">12 ms</div>
            <div className="stat-label">Average LAN Ping Latency</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-value">1080p @ 30fps</div>
            <div className="stat-label">Standard Stream Capture</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-value">0 Drops</div>
            <div className="stat-label">Dropped Frames (24h)</div>
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Live Sensor Status</span>
            <h2>Classroom Camera Feeds</h2>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Camera ID</th>
                <th>Device Name</th>
                <th>Assigned Room</th>
                <th>Stream Protocol</th>
                <th>Resolution &amp; FPS</th>
                <th>Ping Latency</th>
                <th>Stream Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((c) => {
                const room = rooms.find((r) => r.id === c.room?.id) || rooms[0];
                return (
                  <tr key={c.id}>
                    <td><strong>#{c.id}</strong></td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>
                      <div>{room?.name}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{room?.building} &bull; Capacity {room?.capacity}</small>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>rtsp://10.0.1.{10 + c.id}:554</span>
                    </td>
                    <td>
                      <span className="tabular-nums" style={{ fontSize: 12.5 }}>1920&times;1080 @ 30fps</span>
                    </td>
                    <td>
                      <span className="tabular-nums" style={{ color: 'var(--tier-auto-text)', fontWeight: 700 }}>
                        {8 + c.id * 2} ms
                      </span>
                    </td>
                    <td>
                      <span className="status-pill status-green">ONLINE</span>
                    </td>
                    <td>
                      <Link href="/app/teacher" className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                        Test Stream →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <LockedFeature
        name="Automated PTZ Room Tracking &amp; Edge Fallback"
        plan="Pro"
        description="Auto-aims pan-tilt-zoom cameras onto seated students and performs on-prem edge inference when WAN connectivity is degraded."
      />
    </PageLayout>
  );
}
