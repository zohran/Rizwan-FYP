'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Row, Col, Statistic, InputNumber, Button, Input, Select, Space, Typography, Modal, message } from 'antd';
import { DollarOutlined, SendOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

type Billing = { _id: string; userId: { _id: string; username: string }; totalMinutes: number; totalAmount: number; ratePerMinute: number; createdAt: string };
type UserOption = { _id: string; username: string };

export default function BillingPage() {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [rate, setRate] = useState(1);
  const [newRate, setNewRate] = useState<number | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingRate, setUpdatingRate] = useState(false);
  const [sendingNotif, setSendingNotif] = useState<string | null>(null);
  const [notifyAllModal, setNotifyAllModal] = useState<{ userId: string; username: string } | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  const fetchUsers = useCallback(async () => { const res = await fetch('/api/admin/users'); if (res.ok) { const d = await res.json(); setUsers(d.users ?? []); } }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(startDate && { startDate }), ...(endDate && { endDate }), ...(selectedUserId && { userId: selectedUserId }), ...(searchDebounced && { search: searchDebounced }) });
    const [listRes, rateRes, summaryRes] = await Promise.all([fetch(`/api/billing/list?${params}`), fetch('/api/billing/rate'), fetch(`/api/billing/summary?${new URLSearchParams({ ...(startDate && { startDate }), ...(endDate && { endDate }), ...(selectedUserId && { userId: selectedUserId }), ...(searchDebounced && { search: searchDebounced }) })}`)]);
    const listData = await listRes.json(); const rateData = await rateRes.json(); const summaryData = await summaryRes.json();
    if (listRes.ok) { setBillings(listData.billings ?? []); setTotal(listData.total ?? 0); }
    if (rateRes.ok) setRate(rateData.ratePerMinute ?? 1);
    if (summaryRes.ok) { setTotalEarnings(summaryData.totalEarnings ?? 0); setTotalMinutes(summaryData.totalMinutes ?? 0); setTotalRecords(summaryData.totalRecords ?? 0); }
    else if (listRes.ok) { setTotalEarnings(listData.totalEarnings ?? 0); }
    setLoading(false);
  }, [page, startDate, endDate, selectedUserId, searchDebounced]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { const t = setTimeout(() => setSearchDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [startDate, endDate, selectedUserId, searchDebounced]);
  useEffect(() => { fetchData(); }, [fetchData]);

  async function updateRate() {
    if (!newRate || newRate <= 0) return;
    setUpdatingRate(true);
    const res = await fetch('/api/billing/rate', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ratePerMinute: newRate }) });
    if (res.ok) { setRate(newRate); setNewRate(null); fetchData(); }
    setUpdatingRate(false);
  }

  async function sendSessionNotification(billingId: string, userId: string) {
    setSendingNotif(billingId);
    const res = await fetch('/api/admin/send-payment-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, billingId }) });
    if (res.ok) message.success('Payment notification sent');
    else message.error('Failed to send notification');
    setSendingNotif(null);
  }

  async function sendAllNotification(userId: string) {
    setSendingAll(true);
    const res = await fetch('/api/admin/send-payment-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    if (res.ok) message.success('Total balance notification sent');
    else message.error('Failed to send notification');
    setSendingAll(false);
    setNotifyAllModal(null);
  }

  const columns: ColumnsType<Billing> = [
    { title: 'User', key: 'user', render: (_: unknown, r: Billing) => <Text strong>{r.userId?.username ?? 'N/A'}</Text> },
    { title: 'Minutes', dataIndex: 'totalMinutes', key: 'minutes' },
    { title: 'Rate/min', key: 'rate', render: (_: unknown, r: Billing) => `$${r.ratePerMinute.toFixed(2)}` },
    { title: 'Amount', key: 'amount', render: (_: unknown, r: Billing) => <Text strong style={{ color: '#38a169' }}>${r.totalAmount.toFixed(2)}</Text> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', responsive: ['md'], render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Notify',
      key: 'notify',
      width: 140,
      render: (_: unknown, r: Billing) => (
        <Space>
          <Button
            size="small"
            icon={<SendOutlined />}
            loading={sendingNotif === r._id}
            onClick={() => sendSessionNotification(r._id, r.userId?._id)}
            title="Send payment notification for this session"
          >
            Session
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3}>Billing</Title>
          <Text type="secondary">Manage rates, filter records, send payment notifications</Text>
        </Col>
        <Col>
          <Select
            placeholder="Notify user for all sessions"
            style={{ width: 260 }}
            allowClear
            showSearch
            optionFilterProp="label"
            options={users.map((u) => ({ value: u._id, label: u.username }))}
            onSelect={(val: string) => {
              const u = users.find((x) => x._id === val);
              if (u) setNotifyAllModal({ userId: u._id, username: u.username });
            }}
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={8}><Card><Statistic title="Total Earnings" value={totalEarnings} precision={2} prefix="$" valueStyle={{ color: '#38a169' }} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Total Minutes" value={totalMinutes} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Total Records" value={totalRecords} /></Card></Col>
      </Row>

      <Card title="Rate per Minute" style={{ marginBottom: 24 }}>
        <Space align="end">
          <div>
            <Text type="secondary">Current rate</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#4fd1c5' }}>${rate.toFixed(2)} / min</div>
          </div>
          <div>
            <Text type="secondary">New rate ($)</Text>
            <div><InputNumber min={0.01} step={0.01} value={newRate} onChange={(v) => setNewRate(v)} placeholder={String(rate)} /></div>
          </div>
          <Button type="primary" loading={updatingRate} disabled={!newRate} onClick={updateRate}>Update Rate</Button>
        </Space>
      </Card>

      <Card title="Filters" style={{ marginBottom: 24 }}>
        <Space wrap size="middle">
          <div><div><Text type="secondary" style={{ fontSize: 12 }}>Start Date</Text></div><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: 160 }} /></div>
          <div><div><Text type="secondary" style={{ fontSize: 12 }}>End Date</Text></div><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: 160 }} /></div>
          <div><div><Text type="secondary" style={{ fontSize: 12 }}>User</Text></div><Select value={selectedUserId || undefined} onChange={(v) => setSelectedUserId(v ?? '')} allowClear placeholder="All users" style={{ width: 160 }} options={users.map((u) => ({ value: u._id, label: u.username }))} /></div>
          <div><div><Text type="secondary" style={{ fontSize: 12 }}>Search</Text></div><Input.Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search username..." style={{ width: 200 }} allowClear /></div>
        </Space>
      </Card>

      <Card>
        <Table<Billing>
          columns={columns}
          dataSource={billings}
          rowKey="_id"
          loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: (p) => setPage(p), showSizeChanger: false }}
        />
      </Card>

      <Modal
        title="Send Total Balance Notification"
        open={!!notifyAllModal}
        onCancel={() => setNotifyAllModal(null)}
        onOk={() => notifyAllModal && sendAllNotification(notifyAllModal.userId)}
        confirmLoading={sendingAll}
        okText="Send Notification"
      >
        {notifyAllModal && (
          <div>
            <p>Send a payment notification to <strong>{notifyAllModal.username}</strong> for their <strong>total balance across all sessions</strong>?</p>
            <p style={{ marginTop: 8, color: '#999' }}>The client will receive a real-time notification with the total amount due.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
