'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Tag, Button, Space, Typography, Statistic, Row, Col, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useSocket } from '@/hooks/use-socket';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

type Session = {
  id: string;
  username: string;
  machineId: string;
  imageUrl: string;
  startTime: string;
  endTime: string;
  duration: number;
  remainingTime: number;
  liveBilling: number;
};

export default function AdminDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/admin/sessions');
    const data = await res.json();
    if (res.ok) {
      setSessions(data.sessions ?? []);
      setLastUpdate(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => fetchSessions();
    socket.on('session_start', onUpdate);
    socket.on('billing_update', onUpdate);
    return () => {
      socket.off('session_start', onUpdate);
      socket.off('billing_update', onUpdate);
    };
  }, [socket, fetchSessions]);

  async function terminateSession(sessionId: string) {
    setTerminating(sessionId);
    try {
      const res = await fetch('/api/sessions/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) await fetchSessions();
    } finally {
      setTerminating(null);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const totalLive = sessions.reduce((sum, s) => sum + s.liveBilling, 0);

  const columns: ColumnsType<Session> = [
    {
      title: 'User',
      dataIndex: 'username',
      key: 'username',
      render: (name: string, record: Session) => (
        <Space>
          {record.imageUrl ? (
            <img src={record.imageUrl} alt={name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>-</div>
          )}
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    { title: 'Machine', dataIndex: 'machineId', key: 'machineId', responsive: ['md'] },
    {
      title: 'Start',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (v: string) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
    { title: 'Duration', dataIndex: 'duration', key: 'duration', render: (v: number) => `${v} min` },
    {
      title: 'Remaining',
      dataIndex: 'remainingTime',
      key: 'remainingTime',
      render: (v: number) => <Tag color="orange">{formatTime(v)}</Tag>,
    },
    {
      title: 'Billing',
      dataIndex: 'liveBilling',
      key: 'liveBilling',
      render: (v: number) => <Text strong style={{ color: '#38a169' }}>${v.toFixed(2)}</Text>,
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: unknown, record: Session) => (
        <Button
          danger
          size="small"
          loading={terminating === record.id}
          onClick={() => terminateSession(record.id)}
        >
          Terminate
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
          <Text type="secondary">Real-time session monitoring</Text>
        </Col>
        <Col>
          <Space>
            <Tag color="green">Live</Tag>
            {lastUpdate && <Text type="secondary" style={{ fontSize: 12 }}>Updated {lastUpdate.toLocaleTimeString()}</Text>}
            <Button icon={<ReloadOutlined />} onClick={fetchSessions} />
          </Space>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Active Sessions" value={sessions.length} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Live Billing"
              value={totalLive}
              precision={2}
              prefix="$"
              loading={loading}
              valueStyle={{ color: '#38a169' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table<Session>
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: loading ? <Spin /> : 'No active sessions — waiting for connections...' }}
        />
      </Card>
    </div>
  );
}
