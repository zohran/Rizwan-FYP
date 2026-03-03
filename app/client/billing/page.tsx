'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Row, Col, Statistic, Typography, Badge, List, Button, Empty, notification } from 'antd';
import { DollarOutlined, BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useSocket } from '@/hooks/use-socket';
import Link from 'next/link';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;

type BillingRecord = { _id: string; totalMinutes: number; totalAmount: number; ratePerMinute: number; createdAt: string };
type PayNotification = { _id: string; amount: number; message: string; type: string; isRead: boolean; createdAt: string };

export default function ClientBillingPage() {
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [notifications, setNotifications] = useState<PayNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [billRes, notifRes] = await Promise.all([
      fetch('/api/client/billing'),
      fetch('/api/client/notifications'),
    ]);
    const billData = await billRes.json();
    const notifData = await notifRes.json();
    if (billRes.ok) {
      setBillings(billData.billings ?? []);
      setTotalAmount(billData.totalAmount ?? 0);
      setTotalMinutes(billData.totalMinutes ?? 0);
      setTotalSessions(billData.totalSessions ?? 0);
    }
    if (notifRes.ok) {
      setNotifications(notifData.notifications ?? []);
      setUnreadCount(notifData.unreadCount ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload: { id: string; amount: number; message: string; type: string; createdAt: string }) => {
      const newNotif: PayNotification = { _id: payload.id, amount: payload.amount, message: payload.message, type: payload.type, isRead: false, createdAt: payload.createdAt };
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((c) => c + 1);
      notification.info({ message: 'Payment Request', description: payload.message, icon: <DollarOutlined style={{ color: '#4fd1c5' }} />, placement: 'topRight', duration: 8 });
    };
    socket.on('payment_notification', handler);
    return () => { socket.off('payment_notification', handler); };
  }, [socket]);

  async function markRead(notifId: string) {
    await fetch('/api/client/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: notifId }) });
    fetchData();
  }

  async function markAllRead() {
    await fetch('/api/client/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) });
    fetchData();
  }

  const billingColumns: ColumnsType<BillingRecord> = [
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Duration', dataIndex: 'totalMinutes', key: 'minutes', render: (v: number) => `${v} min` },
    { title: 'Rate', key: 'rate', render: (_: unknown, r: BillingRecord) => `$${r.ratePerMinute.toFixed(2)}/min` },
    { title: 'Amount', key: 'amount', render: (_: unknown, r: BillingRecord) => <Text strong style={{ color: '#e53e3e' }}>${r.totalAmount.toFixed(2)}</Text> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9fc', padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>My Billing</Title>
            <Text type="secondary">Your session charges and payment notifications</Text>
          </div>
          <Link href="/client/dashboard"><Button>Back to Dashboard</Button></Link>
        </div>

        {/* Summary cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Total Billed" value={totalAmount} precision={2} prefix="$" valueStyle={{ color: '#e53e3e' }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Total Minutes" value={totalMinutes} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Sessions" value={totalSessions} />
            </Card>
          </Col>
        </Row>

        {/* Payment Notifications */}
        <Card
          title={
            <span>
              <BellOutlined style={{ marginRight: 8 }} />
              Payment Notifications
              {unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 8 }} />}
            </span>
          }
          extra={unreadCount > 0 ? <Button size="small" onClick={markAllRead}>Mark all read</Button> : null}
          style={{ marginBottom: 24 }}
        >
          {notifications.length === 0 ? (
            <Empty description="No payment notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={notifications}
              renderItem={(n) => (
                <List.Item
                  key={n._id}
                  style={{ background: n.isRead ? undefined : '#fffbe6', borderRadius: 8, marginBottom: 4, padding: '12px 16px' }}
                  actions={!n.isRead ? [<Button key="read" size="small" icon={<CheckOutlined />} onClick={() => markRead(n._id)}>Read</Button>] : undefined}
                >
                  <List.Item.Meta
                    title={<Text strong={!n.isRead} style={{ color: n.isRead ? '#999' : undefined }}>${n.amount.toFixed(2)} — {n.type === 'all' ? 'Total Balance' : 'Session Charge'}</Text>}
                    description={
                      <div>
                        <Paragraph style={{ margin: 0, color: n.isRead ? '#bbb' : '#666' }}>{n.message}</Paragraph>
                        <Text type="secondary" style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString()}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Billing history table */}
        <Card title={<span><DollarOutlined style={{ marginRight: 8 }} />Billing History</span>}>
          <Table<BillingRecord>
            columns={billingColumns}
            dataSource={billings}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No billing records yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Card>
      </div>
    </div>
  );
}
