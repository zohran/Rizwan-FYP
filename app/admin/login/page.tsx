'use client';

import { Button, Card, Form, Input, Typography, Alert, Row, Col } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { username: string; password: string }) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Access denied'); setLoading(false); return; }
      router.push('/admin/dashboard');
      router.refresh();
    } catch { setError('Connection failed'); setLoading(false); }
  }

  return (
    <Row style={{ minHeight: '100vh' }}>
      <Col xs={0} lg={12} style={{ background: '#111c44', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <Title level={2} style={{ color: '#fff', margin: 0 }}>SessionMgmt</Title>
          <Title level={1} style={{ color: '#fff', marginTop: 32 }}>Monitoring & <span style={{ color: '#4fd1c5' }}>Control Panel</span></Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>Manage sessions, billing, alerts, and logs from a single dashboard.</Paragraph>
        </div>
      </Col>
      <Col xs={24} lg={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Title level={2}>Admin Login</Title>
          <Text type="secondary">Sign in to access the control panel</Text>
          <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 32 }} size="large">
            <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Username is required' }]}>
              <Input prefix={<UserOutlined />} placeholder="admin" autoComplete="username" />
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
