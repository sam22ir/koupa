import { createContext, useContext, type ReactNode } from 'react';

import { useSession } from '@/src/hooks/useSession';

type SessionContextValue = ReturnType<typeof useSession>;

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const session = useSession();
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useAppSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useAppSession must be used within SessionProvider');
  }
  return value;
}
