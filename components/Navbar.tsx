'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(10,10,15,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 1.5rem',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.2rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          paste<span style={{ color: 'var(--accent)' }}>flow</span>
          <span style={{ color: 'var(--accent)', fontSize: '0.5rem', verticalAlign: 'super' }}>●</span>
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {session ? (
          <>
            <Link href="/dashboard" style={linkStyle}>dashboard</Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              style={ghostBtnStyle}
            >
              sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/signin" style={linkStyle}>sign in</Link>
            <Link href="/auth/register" style={accentBtnStyle}>register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const linkStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontSize: '0.8rem',
  fontFamily: 'var(--font-mono)',
  transition: 'color 0.15s',
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
  padding: '0.3rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.8rem',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  transition: 'border-color 0.15s, color 0.15s',
};

const accentBtnStyle: React.CSSProperties = {
  background: 'var(--accent)',
  border: '1px solid var(--accent)',
  color: '#fff',
  padding: '0.3rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.8rem',
  textDecoration: 'none',
  fontFamily: 'var(--font-mono)',
  transition: 'opacity 0.15s',
};
