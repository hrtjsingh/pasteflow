'use client';
import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

// useSearchParams must be inside a Suspense boundary for static prerendering
function SignInForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const registered   = searchParams.get('registered') === '1';

  const [email,   setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setError('All fields required'); return; }
    // Basic client-side length guard — server enforces the real limits
    if (password.length > 72) { setError('Password too long'); return; }

    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email:    email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      // Map NextAuth error codes to friendly messages without leaking details
      if (result.error === 'TOO_MANY_ATTEMPTS') {
        setError('Too many login attempts. Please wait and try again.');
      } else {
        setError('Invalid email or password');
      }
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem' }}>
        <div style={cardStyle} className="animate-fade-up">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              welcome back
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
              sign in to manage your pastes
            </p>
          </div>

          {registered && (
            <div role="status" style={{
              padding: '0.6rem 1rem', marginBottom: '1rem',
              background: 'rgba(61,220,151,0.08)', border: '1px solid rgba(61,220,151,0.3)',
              borderRadius: '8px', color: 'var(--green)', fontSize: '0.82rem',
            }}>
              Account created! Sign in below.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label htmlFor="email" style={labelStyle}>email</label>
              <input
                id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="password" style={labelStyle}>password</label>
              <input
                id="password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                autoComplete="current-password"
                maxLength={72}
                style={inputStyle}
              />
            </div>

            {error && (
              <div role="alert" style={{
                padding: '0.6rem 1rem',
                background: 'rgba(255,95,109,0.08)', border: '1px solid rgba(255,95,109,0.3)',
                borderRadius: '8px', color: 'var(--red)', fontSize: '0.82rem',
              }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading} aria-busy={loading} style={submitBtn}>
              {loading ? 'signing in...' : 'sign in →'}
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            no account?{' '}
            <Link href="/auth/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              register here
            </Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            or{' '}
            <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              paste anonymously →
            </Link>
          </p>
        </div>
      </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: '16px', padding: '2rem', maxWidth: '380px', width: '100%',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem',
};
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text-primary)', padding: '0.6rem 0.9rem', fontSize: '0.85rem',
  fontFamily: 'var(--font-mono)', outline: 'none', width: '100%',
};
const submitBtn: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff', border: 'none',
  padding: '0.7rem', borderRadius: '8px', fontSize: '0.88rem',
  fontFamily: 'var(--font-mono)', fontWeight: 700, cursor: 'pointer', width: '100%',
};

export default function SignInPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <Suspense fallback={
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'80vh' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>loading...</span>
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}
