'use client';

import { ConfigProvider, theme } from 'antd';

const navyToken = {
  colorPrimary: '#4fd1c5',
  colorBgBase: '#ffffff',
  colorTextBase: '#1a202c',
  colorLink: '#4fd1c5',
  colorSuccess: '#38a169',
  colorWarning: '#d69e2e',
  colorError: '#e53e3e',
  colorInfo: '#4299e1',
  borderRadius: 8,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: navyToken,
        algorithm: theme.defaultAlgorithm,
        components: {
          Layout: {
            siderBg: '#111c44',
            headerBg: '#111c44',
            bodyBg: '#f7f9fc',
          },
          Menu: {
            darkItemBg: '#111c44',
            darkItemColor: 'rgba(255,255,255,0.6)',
            darkItemHoverBg: 'rgba(255,255,255,0.08)',
            darkItemSelectedBg: 'rgba(79,209,197,0.15)',
            darkItemSelectedColor: '#4fd1c5',
          },
          Button: {
            primaryShadow: '0 4px 14px 0 rgba(79,209,197,0.35)',
          },
          Card: {
            borderRadiusLG: 16,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
