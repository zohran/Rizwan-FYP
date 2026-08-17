'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';

export function ClientSessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const socket = useSocket();

  useEffect(() => {
    if (!socket || pathname === '/client/login') return;
    const onTerminate = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // still leave the session UI
      }
      router.push('/client/login');
      router.refresh();
    };
    socket.on('session_terminate', onTerminate);
    return () => {
      socket.off('session_terminate', onTerminate);
    };
  }, [socket, router, pathname]);

  return <>{children}</>;
}
