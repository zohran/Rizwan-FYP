'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Input, Select, Button, Space, Typography, Modal, Descriptions, Image, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

type Log = { _id: string; userId: { username: string }; loginTime: string; logoutTime: string; duration: number; machineId: string; billingAmount: number; imageUrl: string; eventType: string };
type UserOption = { _id: string; username: string };

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const fetchUsers = useCallback(async () => { const r = await fetch('/api/admin/users'); if (r.ok) { const d = await r.json(); setUsers(d.users ?? []); } }, []);
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(startDate && { startDate }), ...(endDate && { endDate }), ...(selectedUserId && { userId: selectedUserId }), ...(searchDebounced && { search: searchDebounced }) });
    const res = await fetch(`/api/logs?${params}`); const data = await res.json();
    if (res.ok) { setLogs(data.logs ?? []); setTotal(data.total ?? 0); }
    setLoading(false);
  }, [page, startDate, endDate, selectedUserId, searchDebounced]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { const t = setTimeout(() => setSearchDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [startDate, endDate, selectedUserId, searchDebounced]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns: ColumnsType<Log> = [
    { title: 'User', key: 'user', render: (_: unknown, r: Log) => <Text strong>{r.userId?.username ?? 'N/A'}</Text> },
    { title: 'Login', key: 'login', render: (_: unknown, r: Log) => new Date(r.loginTime).toLocaleString() },
    { title: 'Logout', key: 'logout', responsive: ['md'], render: (_: unknown, r: Log) => new Date(r.logoutTime).toLocaleString() },
    { title: 'Duration', dataIndex: 'duration', key: 'duration', render: (v: number) => `${v} min` },
    { title: 'Billing', key: 'billing', render: (_: unknown, r: Log) => <Text strong style={{ color: '#38a169' }}>${r.billingAmount.toFixed(2)}</Text> },
    {
      title: 'Image', key: 'image', responsive: ['sm'],
      render: (_: unknown, r: Log) => r.imageUrl ? <Image src={r.imageUrl} alt="Capture" width={36} height={36} style={{ borderRadius: 8, objectFit: 'cover' }} /> : '—',
    },
    { title: '', key: 'action', width: 80, render: (_: unknown, r: Log) => <Button size="small" onClick={() => setSelectedLog(r)}>View</Button> },
  ];

  return (
    <div className="animate-fade-in">
      <Title level={3}>Logs</Title>
      <Text type="secondary">Session history — search by date range, filter by user</Text>

      <Card title="Search & Filters" style={{ marginTop: 24, marginBottom: 24 }}>
        <Space wrap size="middle">
          <div>
            <div><Text type="secondary" style={{ fontSize: 12 }}>Start Date</Text></div>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: 160 }} />
          </div>
          <div>
            <div><Text type="secondary" style={{ fontSize: 12 }}>End Date</Text></div>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: 160 }} />
          </div>
          <div>
            <div><Text type="secondary" style={{ fontSize: 12 }}>User</Text></div>
            <Select value={selectedUserId || undefined} onChange={(v) => setSelectedUserId(v ?? '')} allowClear placeholder="All users" style={{ width: 160 }} options={users.map((u) => ({ value: u._id, label: u.username }))} />
          </div>
          <div>
            <div><Text type="secondary" style={{ fontSize: 12 }}>Search</Text></div>
            <Input.Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search username..." style={{ width: 200 }} allowClear />
          </div>
        </Space>
      </Card>

      <Card>
        <Table<Log>
          columns={columns}
          dataSource={logs}
          rowKey="_id"
          loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: (p) => setPage(p), showSizeChanger: false }}
        />
      </Card>

      <Modal title="Log Details" open={!!selectedLog} onCancel={() => setSelectedLog(null)} footer={<Button onClick={() => setSelectedLog(null)}>Close</Button>} width={520}>
        {selectedLog && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="User">{selectedLog.userId?.username ?? 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Login">{new Date(selectedLog.loginTime).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Logout">{new Date(selectedLog.logoutTime).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Duration">{selectedLog.duration} min</Descriptions.Item>
              <Descriptions.Item label="Billing"><Text strong style={{ color: '#38a169' }}>${selectedLog.billingAmount.toFixed(2)}</Text></Descriptions.Item>
              <Descriptions.Item label="Machine">{selectedLog.machineId}</Descriptions.Item>
              <Descriptions.Item label="Event"><Tag>{selectedLog.eventType}</Tag></Descriptions.Item>
            </Descriptions>
            {selectedLog.imageUrl && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Login capture</Text>
                <div style={{ marginTop: 8 }}><Image src={selectedLog.imageUrl} alt="Login capture" style={{ maxHeight: 240, borderRadius: 8 }} /></div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
