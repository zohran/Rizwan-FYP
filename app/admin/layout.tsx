'use client';

import { Layout, Menu } from 'antd';
import { DashboardOutlined, DollarOutlined, AlertOutlined, FileTextOutlined, LogoutOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';

const { Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/admin/billing', icon: <DollarOutlined />, label: 'Billing' },
  { key: '/admin/alerts', icon: <AlertOutlined />, label: 'Alerts' },
  { key: '/admin/logs', icon: <FileTextOutlined />, label: 'Logs' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const selectedKey = menuItems?.find(
    (item) => item && 'key' in item && (pathname === item.key || (item.key !== '/admin/dashboard' && pathname.startsWith(item.key as string)))
  )?.key as string ?? '/admin/dashboard';

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        theme="dark"
        style={{ background: '#111c44', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50 }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>SessionMgmt</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ background: '#111c44', borderRight: 0, marginTop: 8 }}
        />
        <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectable={false}
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout, danger: true }]}
            style={{ background: '#111c44', borderRight: 0 }}
          />
        </div>
      </Sider>
      <Layout style={{ marginLeft: 240, background: '#f7f9fc' }}>
        <Content style={{ padding: 32, minHeight: '100vh' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
