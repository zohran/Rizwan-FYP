import { ClientSessionGuard } from '@/components/client-session-guard';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientSessionGuard>{children}</ClientSessionGuard>;
}
