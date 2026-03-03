'use client';

import { Button, Typography, Row, Col, Card, Space } from 'antd';
import { ClockCircleOutlined, DollarOutlined, SafetyOutlined, CameraOutlined, LockOutlined, FileTextOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph, Text } = Typography;

const features = [
  { icon: <ClockCircleOutlined style={{ fontSize: 28, color: '#4fd1c5' }} />, title: 'Real-Time Monitoring', desc: 'Watch active sessions live with instant updates via WebSocket.' },
  { icon: <DollarOutlined style={{ fontSize: 28, color: '#4fd1c5' }} />, title: 'Automated Billing', desc: 'Configurable per-minute rates with automatic calculation on session end.' },
  { icon: <SafetyOutlined style={{ fontSize: 28, color: '#4fd1c5' }} />, title: 'Security Alerts', desc: 'Blocked logins, unauthorized access, and suspicious activity detection.' },
  { icon: <CameraOutlined style={{ fontSize: 28, color: '#4fd1c5' }} />, title: 'Webcam Verification', desc: 'Captures login image for identity verification on every session.' },
  { icon: <LockOutlined style={{ fontSize: 28, color: '#4fd1c5' }} />, title: 'Role-Based Access', desc: 'Separate client and admin portals with JWT authentication.' },
  { icon: <FileTextOutlined style={{ fontSize: 28, color: '#4fd1c5' }} />, title: 'Session Logs', desc: 'Full history with search, filters, billing amounts, and captured images.' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section style={{ background: '#111c44', padding: '32px 24px 96px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 80 }}>
            <Text strong style={{ fontSize: 20, color: '#fff' }}>SessionMgmt</Text>
            <Space>
              <Link href="/client/login"><Button type="text" style={{ color: 'rgba(255,255,255,0.7)' }}>Client Login</Button></Link>
              <Link href="/admin/login"><Button type="primary">Admin Login</Button></Link>
            </Space>
          </div>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
            <Title style={{ color: '#fff', fontSize: 48, lineHeight: 1.2, margin: 0 }}>
              Intelligent Session<br /><span style={{ color: '#4fd1c5' }}>Management System</span>
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginTop: 24 }}>
              Real-time monitoring, automated billing, secure authentication, and comprehensive session tracking — all in one platform.
            </Paragraph>
            <Space size="large" style={{ marginTop: 40 }}>
              <Link href="/client/login"><Button type="primary" size="large" style={{ height: 48, paddingInline: 32 }}>Get Started</Button></Link>
              <Link href="/admin/login"><Button size="large" ghost style={{ height: 48, paddingInline: 32, color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>Admin Panel</Button></Link>
            </Space>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: '#f7f9fc', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <Title level={2}>Everything You Need</Title>
          <Paragraph type="secondary" style={{ maxWidth: 500, margin: '0 auto 48px' }}>
            A complete suite for session management, monitoring, and billing.
          </Paragraph>
          <Row gutter={[24, 24]}>
            {features.map((f) => (
              <Col xs={24} md={12} lg={8} key={f.title}>
                <Card hoverable style={{ height: '100%', textAlign: 'left' }}>
                  <div style={{ marginBottom: 16 }}>{f.icon}</div>
                  <Title level={5}>{f.title}</Title>
                  <Text type="secondary">{f.desc}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#1b254b', padding: '80px 24px', textAlign: 'center' }}>
        <Title level={2} style={{ color: '#fff' }}>Ready to Get Started?</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 400, margin: '0 auto' }}>
          Login as a client to start sessions or access the admin panel to monitor.
        </Paragraph>
        <Space size="large" style={{ marginTop: 32 }}>
          <Link href="/client/login"><Button type="primary" size="large">Client Portal</Button></Link>
          <Link href="/admin/login"><Button size="large" ghost style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>Admin Panel</Button></Link>
        </Space>
      </section>
    </div>
  );
}
