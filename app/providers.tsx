'use client';
import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';

type RefreshSig = () => <T>(type: T) => T;
type RefreshReg = (type: unknown, id?: string) => void;
type RefreshGlobal = typeof globalThis & {
  $RefreshSig$?: RefreshSig;
  $RefreshReg$?: RefreshReg;
};

// Shim React Fast Refresh globals when the plugin is disabled (CSP-safe dev builds)
// to avoid $RefreshSig$/$RefreshReg$ ReferenceErrors emitted by the transform.
function RefreshRuntimeShim() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const globalObj = globalThis as RefreshGlobal;

    if (!globalObj.$RefreshSig$) {
      const refreshSig: RefreshSig = () => (type) => type;
      globalObj.$RefreshSig$ = refreshSig;
    }
    if (!globalObj.$RefreshReg$) {
      const refreshReg: RefreshReg = () => {};
      globalObj.$RefreshReg$ = refreshReg;
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RefreshRuntimeShim />
      {children}
    </SessionProvider>
  );
}
