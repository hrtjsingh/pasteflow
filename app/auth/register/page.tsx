'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

// Enforce same constraints as RegisterSchema on the client so users get
// instant feedback, but the server is still the authoritative validator.
function validateForm(email: string, username: string, password: string): string | null {
  if (!email || !username || !password) return 'All fields are required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address';
  if (username.length < 3 || username.length > 30) return 'Username must be 3–30 characters';
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Username: letters, numbers, _ and - only';
  if (password.length < 8 || password.length > 72) return 'Password must be 8–72 characters';
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit() {
    const validationError = validateForm(email, username, password);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only send what the server expects
        body: JSON.stringify({ email: email.trim(), username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      router.push('/auth/signin?registered=1');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem' }}>
        <div style={cardStyle} className="animate-fade-up">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✦</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              create account
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
              save and manage your pastes
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'email',    type: 'email',    value: email,    set: setEmail,    placeholder: 'you@example.com', autocomplete: 'email' },
              { label: 'username', type: 'text',     value: username, set: setUsername, placeholder: 'devguru42',       autocomplete: 'username' },
              { label: 'password', type: 'password', value: password, set: setPassword, placeholder: '••••••••',       autocomplete: 'new-password' },
            ].map(f => (
              <div key={f.label}>
                <label htmlFor={`field-${f.label}`} style={labelStyle}>{f.label}</label>
                <input
                  id={`field-${f.label}`}
                  type={f.type}
                  value={f.value}
                  autoComplete={f.autocomplete}
                  onChange={e => f.set(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={f.placeholder}
                  style={inputStyle}
                  maxLength={f.label === 'email' ? 254 : f.label === 'username' ? 30 : 72}
                />
              </div>
            ))}

            {error && (
              <div role="alert" style={{
                padding: '0.6rem 1rem',
                background: 'rgba(255,95,109,0.08)', border: '1px solid rgba(255,95,109,0.3)',
                borderRadius: '8px', color: 'var(--red)', fontSize: '0.82rem',
              }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading} style={submitBtn}
              aria-busy={loading}>
              {loading ? 'creating account...' : 'create account →'}
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            already have one?{' '}
            <Link href="/auth/signin" style={{ color: 'var(--accent)', textDecoration: 'none' }}>sign in</Link>
          </p>
        </div>
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
  fontFamily: 'var(--font-mono)', fontWeight: 700, cursor: 'pointer',
  width: '100%', marginTop: '0.25rem',
};
