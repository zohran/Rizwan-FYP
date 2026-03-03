'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Typography, Space, Modal, Alert, Spin, Row, Col, Badge, notification } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useSocket } from '@/hooks/use-socket';
import { SessionTimer } from '@/components/session-timer';
import Link from 'next/link';

const { Title, Text } = Typography;

type Session = { id: string; startTime: string; endTime: string; remainingTime: number; duration: number; machineId: string; imageUrl: string };
const DURATIONS = [30, 60, 90];

export default function ClientDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(true);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const socket = useSocket();

  const fetchSession = useCallback(async () => {
    const res = await fetch('/api/sessions/active'); const data = await res.json();
    if (!res.ok && res.status === 401) { router.push('/client/login'); return; }
    if (data.session) { setSession(data.session); setShowDurationModal(false); }
  }, [router]);

  useEffect(() => { fetchSession(); }, [fetchSession]);
  useEffect(() => { if (!session) return; const i = setInterval(fetchSession, 30000); return () => clearInterval(i); }, [session, fetchSession]);
  useEffect(() => {
    if (!socket) return;
    socket.on('session_terminate', () => { router.push('/client/login'); router.refresh(); });
    socket.on('payment_notification', (payload: { message: string; amount: number }) => {
      notification.info({ message: 'Payment Request', description: payload.message, icon: <DollarOutlined style={{ color: '#4fd1c5' }} />, placement: 'topRight', duration: 8 });
    });
    return () => { socket.off('session_terminate'); socket.off('payment_notification'); };
  }, [socket, router]);
  useEffect(() => {
    if (!session) return;
    const i = setInterval(() => { setSession((p) => { if (!p || p.remainingTime <= 0) return p; if (p.remainingTime <= 300 && !showWarning) setShowWarning(true); return { ...p, remainingTime: p.remainingTime - 1 }; }); }, 1000);
    return () => clearInterval(i);
  }, [session?.remainingTime, showWarning]);
  useEffect(() => {
    if (session && session.remainingTime <= 0) { fetch('/api/sessions/end', { method: 'POST' }).then(() => fetch('/api/auth/logout', { method: 'POST' })).then(() => router.push('/client/login')).catch(() => router.push('/client/login')); }
  }, [session?.remainingTime, router]);

  async function captureWebcam(): Promise<string> {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true }); const video = document.createElement('video'); video.srcObject = stream; await video.play();
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext('2d')!.drawImage(video, 0, 0); stream.getTracks().forEach((t) => t.stop());
    return canvas.toDataURL('image/png');
  }

  async function startSession(duration: number) {
    setWebcamError(null); setIsStarting(true);
    try {
      let imageUrl = ''; const stored = typeof window !== 'undefined' ? sessionStorage.getItem('clientLoginImage') : null;
      if (stored) { imageUrl = stored; } else {
        try { const b64 = await captureWebcam(); const sr = await fetch('/api/auth/save-login-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: b64 }) }); const sj = await sr.json(); if (sr.ok && sj.imagePath) { imageUrl = sj.imagePath; sessionStorage.setItem('clientLoginImage', sj.imagePath); } else throw new Error('Failed'); } catch { setWebcamError('Camera access denied. Session blocked.'); setIsStarting(false); return; }
      }
      const res = await fetch('/api/sessions/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration, machineId: `client-${Date.now()}`, imageUrl }) });
      const data = await res.json(); if (!res.ok) { setWebcamError(data.error ?? 'Failed to start session'); setIsStarting(false); return; }
      setSession(data.session); setShowDurationModal(false);
    } finally { setIsStarting(false); }
  }

  async function handleEndSession() { try { await fetch('/api/sessions/end', { method: 'POST' }); await fetch('/api/auth/logout', { method: 'POST' }); router.push('/client/login'); router.refresh(); } catch { router.push('/client/login'); } }
  function formatDateTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

  if (showDurationModal && !session) {
    return (
      <div style={{ minHeight: '100vh', background: '#111c44', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ width: 380, textAlign: 'center' }}>
          <Title level={3}>Start Session</Title>
          <Text type="secondary">Select duration (camera required)</Text>
          {webcamError && <Alert message={webcamError} type="error" showIcon style={{ marginTop: 16 }} />}
          <Row gutter={[12, 12]} style={{ marginTop: 24 }}>
            {DURATIONS.map((d) => (
              <Col span={8} key={d}>
                <Button block size="large" loading={isStarting} onClick={() => startSession(d)} style={{ height: 80, fontSize: 18, fontWeight: 600 }}>
                  {d} min
                </Button>
              </Col>
            ))}
          </Row>
          <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
            <Link href="/client/billing"><Button block icon={<DollarOutlined />}>View My Billing</Button></Link>
            <Button
              type="text"
              block
              style={{ color: '#999' }}
              onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/client/login'); router.refresh(); }}
            >
              Logout
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', background: '#111c44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111c44', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <SessionTimer remainingSeconds={session.remainingTime} totalSeconds={session.duration * 60} size={240} strokeWidth={8} />
      <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 24 }}>
        Started {formatDateTime(session.startTime)} &middot; {session.machineId}
      </Text>
      <Link href="/client/billing">
        <Button type="link" icon={<DollarOutlined />} style={{ color: '#4fd1c5', marginTop: 12 }}>
          View My Billing
        </Button>
      </Link>
      {showWarning && <Alert message="5 minutes remaining — session ends automatically" type="warning" showIcon style={{ marginTop: 24, maxWidth: 380 }} />}
      <Button danger type="primary" size="large" onClick={handleEndSession} style={{ marginTop: 32, width: 280, height: 48 }}>
        End Session
      </Button>

      <Modal title="5 Minutes Left" open={showWarning} onCancel={() => setShowWarning(false)} footer={<Button type="primary" onClick={() => setShowWarning(false)}>OK</Button>}>
        <Text>Session will end automatically at zero.</Text>
      </Modal>
    </div>
  );
}
