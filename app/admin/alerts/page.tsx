'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Tag, Space, Typography, Checkbox, List, Badge, message } from 'antd';
import { useSocket } from '@/hooks/use-socket';

const { Title, Text, Paragraph } = Typography;

type Alert = {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId?: { username: string };
  sessionId?: string;
  severity?: string;
  ruleId?: string;
};
type IncomingAlert = {
  id: string;
  type: string;
  message: string;
  createdAt?: string;
  sessionId?: string;
  severity?: string;
  ruleId?: string;
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  blocked_login: 'Blocked Login',
  unauthorized_access: 'Unauthorized Access',
  suspicious_session: 'Suspicious Session',
  network_violation: 'Network Policy Violation',
};
const ALERT_TYPE_COLORS: Record<string, string> = {
  blocked_login: 'red',
  unauthorized_access: 'orange',
  suspicious_session: 'gold',
  network_violation: 'magenta',
};
const SEVERITY_COLORS: Record<string, string> = { medium: 'gold', high: 'orange', critical: 'red' };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [terminatedIds, setTerminatedIds] = useState<string[]>([]);
  const socket = useSocket();

  function sessionIdOf(a: Alert): string {
    if (!a.sessionId) return '';
    return String(a.sessionId);
  }

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
      setAlerts((prev) => [{
        _id: payload.id,
        type: payload.type,
        message: payload.message,
        isRead: false,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        sessionId: payload.sessionId,
        severity: payload.severity,
        ruleId: payload.ruleId,
      }, ...prev]);
      setUnreadCount((c) => c + 1);
    };
    socket.on('alert_create', handler);
    return () => { socket.off('alert_create', handler); };
  }, [socket]);

  async function markRead(alertId: string) { await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alertId }) }); fetchAlerts(); }
  async function markAllRead() { await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }); fetchAlerts(); }

  async function terminateFromAlert(sessionId: string) {
    setTerminating(sessionId);
    try {
      const res = await fetch('/api/sessions/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        message.success('Session terminated');
        setTerminatedIds((ids) => [...ids, sessionId]);
      } else {
        message.error(data.error ?? 'Could not terminate session');
      }
    } finally {
      setTerminating(null);
    }
  }

  function borderColor(type: string) {
    if (type === 'blocked_login') return '#ff4d4f';
    if (type === 'unauthorized_access') return '#fa8c16';
    if (type === 'network_violation') return '#c41d7f';
    return '#faad14';
  }

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
            style={{ marginBottom: 12, borderLeft: a.isRead ? undefined : `3px solid ${borderColor(a.type)}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Space wrap size={[8, 8]}>
                  <Tag color={ALERT_TYPE_COLORS[a.type] ?? 'default'}>{ALERT_TYPE_LABELS[a.type] ?? a.type}</Tag>
                  {a.severity && <Tag color={SEVERITY_COLORS[a.severity] ?? 'default'}>{a.severity.toUpperCase()}</Tag>}
                </Space>
                <Paragraph style={{ marginTop: 8, marginBottom: 4, color: a.isRead ? '#999' : undefined }}>{a.message}</Paragraph>
                <Text type="secondary" style={{ fontSize: 12 }}>{new Date(a.createdAt).toLocaleString()}</Text>
              </div>
              <Space>
                {sessionIdOf(a) && !terminatedIds.includes(sessionIdOf(a)) && (
                  <Button
                    danger
                    size="small"
                    loading={terminating === sessionIdOf(a)}
                    onClick={() => terminateFromAlert(sessionIdOf(a))}
                  >
                    Terminate Session
                  </Button>
                )}
                {!a.isRead && <Button size="small" onClick={() => markRead(a._id)}>Mark read</Button>}
              </Space>
            </div>
          </Card>
        )}
      />
    </div>
  );
}
