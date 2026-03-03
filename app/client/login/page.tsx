'use client';

import { Button, Form, Input, Typography, Alert, Row, Col } from 'antd';
import { LockOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;
const LOGIN_IMAGE_KEY = 'clientLoginImage';

async function captureWebcamSnapshot(): Promise<string> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  const video = document.createElement('video');
  video.srcObject = stream;
  await video.play();
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  stream.getTracks().forEach((t) => t.stop());
  return canvas.toDataURL('image/png');
}

export default function ClientLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { username: string; password: string }) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/client-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Login failed'); setLoading(false); return; }
      try {
        const imageBase64 = await captureWebcamSnapshot();
        const saveRes = await fetch('/api/auth/save-login-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64 }) });
        const saveJson = await saveRes.json();
        if (!saveRes.ok) { await fetch('/api/auth/logout', { method: 'POST' }); setError(saveJson.error ?? 'Failed to save login image.'); setLoading(false); return; }
        if (saveJson.imageBase64 && typeof window !== 'undefined') sessionStorage.setItem(LOGIN_IMAGE_KEY, saveJson.imageBase64);
      } catch {
        await fetch('/api/auth/logout', { method: 'POST' });
        setError('Camera access denied. Session blocked.');
        setLoading(false);
        return;
      }
      router.push('/client/dashboard');
      router.refresh();
    } catch { setError('Network error. Please try again.'); setLoading(false); }
  }

  return (
    <Row style={{ minHeight: '100vh' }}>
      <Col xs={0} lg={12} style={{ background: '#111c44', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <Title level={2} style={{ color: '#fff', margin: 0 }}>SessionMgmt</Title>
          <Title level={1} style={{ color: '#fff', marginTop: 32 }}>Start Your <span style={{ color: '#4fd1c5' }}>Session</span></Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>Sign in and grant camera access to begin your timed session.</Paragraph>
        </div>
      </Col>
      <Col xs={24} lg={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Title level={2}>Client Login</Title>
          <Text type="secondary"><CameraOutlined /> Camera required for identity verification</Text>
          <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 32 }} size="large">
            <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Username is required' }]}>
              <Input prefix={<UserOutlined />} placeholder="Enter username" autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password is required' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Enter password" autoComplete="current-password" />
            </Form.Item>
            {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">Sign In</Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'center' }}>
            <Link href="/" style={{ color: '#999' }}>← Back to home</Link>
          </div>
        </div>
      </Col>
    </Row>
  );
}
