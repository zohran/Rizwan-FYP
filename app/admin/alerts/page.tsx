'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Tag, Space, Typography, Checkbox, List, Badge, notification } from 'antd';
import { useSocket } from '@/hooks/use-socket';

const { Title, Text, Paragraph } = Typography;

type Alert = { _id: string; type: string; message: string; isRead: boolean; createdAt: string; userId?: { username: string } };
type IncomingAlert = { id: string; type: string; message: string; createdAt?: string };

const ALERT_TYPE_LABELS: Record<string, string> = { blocked_login: 'Blocked Login', unauthorized_access: 'Unauthorized Access', suspicious_session: 'Suspicious Session' };
const ALERT_TYPE_COLORS: Record<string, string> = { blocked_login: 'red', unauthorized_access: 'orange', suspicious_session: 'gold' };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useSocket();

  const fetchAlerts = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '50', unreadOnly: String(unreadOnly) });
    const res = await fetch(`/api/alerts?${params}`);
    const data = await res.json();
    if (res.ok) { setAlerts(data.alerts ?? []); setTotal(data.total ?? 0); setUnreadCount(data.unreadCount ?? 0); }
  }, [page, unreadOnly]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload: IncomingAlert) => {
      setAlerts((prev) => [{ _id: payload.id, type: payload.type, message: payload.message, isRead: false, createdAt: payload.createdAt ?? new Date().toISOString() }, ...prev]);
      setUnreadCount((c) => c + 1);
      notification.warning({ message: ALERT_TYPE_LABELS[payload.type] ?? payload.type, description: payload.message, placement: 'bottomRight' });
    };
    socket.on('alert_create', handler);
    return () => { socket.off('alert_create', handler); };
  }, [socket]);

  async function markRead(alertId: string) { await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alertId }) }); fetchAlerts(); }
  async function markAllRead() { await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }); fetchAlerts(); }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Alerts <Badge count={unreadCount} style={{ marginLeft: 8 }} />
          </Title>
          <Text type="secondary">Security and system notifications</Text>
        </div>
        <Space>
          <Checkbox checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)}>Unread only</Checkbox>
          <Button onClick={markAllRead}>Mark all read</Button>
        </Space>
      </div>

      <List
        dataSource={alerts}
        locale={{ emptyText: 'No alerts found' }}
        pagination={{ current: page, total, pageSize: 50, onChange: (p) => setPage(p), showSizeChanger: false }}
        renderItem={(a) => (
          <Card
            key={a._id}
            style={{ marginBottom: 12, borderLeft: a.isRead ? undefined : `3px solid ${a.type === 'blocked_login' ? '#ff4d4f' : a.type === 'unauthorized_access' ? '#fa8c16' : '#faad14'}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Tag color={ALERT_TYPE_COLORS[a.type] ?? 'default'}>{ALERT_TYPE_LABELS[a.type] ?? a.type}</Tag>
                <Paragraph style={{ marginTop: 8, marginBottom: 4, color: a.isRead ? '#999' : undefined }}>{a.message}</Paragraph>
                <Text type="secondary" style={{ fontSize: 12 }}>{new Date(a.createdAt).toLocaleString()}</Text>
              </div>
              {!a.isRead && <Button size="small" onClick={() => markRead(a._id)}>Mark read</Button>}
            </div>
          </Card>
        )}
      />
    </div>
  );
}
