'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface PasteMeta {
  _id: string;
  shortId: string;
  title: string;
  language: string;
  visibility: string;
  views: number;
  burnAfterRead: boolean;
  expiresAt?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pastes, setPastes] = useState<PasteMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/pastes').then(r => r.json()).then(data => {
      setPastes(data.pastes || []);
      setLoading(false);
    });
  }, [status]);

  async function deletePaste(shortId: string) {
    setDeletingId(shortId);
    await fetch(`/api/pastes/${shortId}`, { method: 'DELETE' });
    setPastes(p => p.filter(x => x.shortId !== shortId));
    setDeletingId(null);
  }

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }} className="animate-fade-up">
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              your pastes
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
              {session?.user?.name} · {pastes.length} paste{pastes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/" style={{
            background: 'var(--accent)', color: '#fff', textDecoration: 'none',
            padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)', fontWeight: 700,
          }}>
            + new paste
          </Link>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem', marginBottom: '1.5rem',
        }} className="animate-fade-up-delay">
          {[
            { label: 'total pastes', value: pastes.length },
            { label: 'total views', value: pastes.reduce((a,p) => a + p.views, 0).toLocaleString() },
            { label: 'public', value: pastes.filter(p => p.visibility === 'public').length },
            { label: 'private', value: pastes.filter(p => p.visibility === 'private').length },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '1rem',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Paste list */}
        {pastes.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '16px', color: 'var(--text-muted)',
          }} className="animate-fade-up-delay-2">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>no pastes yet</p>
            <Link href="/" style={{
              background: 'var(--accent)', color: '#fff', textDecoration: 'none',
              padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
            }}>
              create your first paste →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="animate-fade-up-delay-2">
            {pastes.map(paste => (
              <div key={paste._id} style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                transition: 'border-color 0.15s',
                flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <Link href={`/p/${paste.shortId}`} style={{
                      fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)',
                      textDecoration: 'none', fontFamily: 'var(--font-display)',
                    }}>
                      {paste.title || 'untitled paste'}
                    </Link>
                    <span style={tagStyle}>{paste.language}</span>
                    <span style={tagStyle}>{paste.visibility}</span>
                    {paste.burnAfterRead && <span style={{ ...tagStyle, borderColor: 'var(--red)', color: 'var(--red)' }}>🔥</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>/{paste.shortId}</span>
                    <span>{paste.views} views</span>
                    <span>{timeAgo(paste.createdAt)}</span>
                    {paste.expiresAt && <span>exp {new Date(paste.expiresAt).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link href={`/p/${paste.shortId}`} style={smBtn}>view</Link>
                  <button
                    onClick={() => deletePaste(paste.shortId)}
                    disabled={deletingId === paste.shortId}
                    style={{ ...smBtn, color: 'var(--red)', borderColor: 'rgba(255,95,109,0.3)' }}
                  >
                    {deletingId === paste.shortId ? '...' : 'delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const tagStyle: React.CSSProperties = {
  fontSize: '0.65rem', padding: '0.1rem 0.4rem',
  border: '1px solid var(--border)', borderRadius: '4px',
  color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
};
const smBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--text-secondary)', padding: '0.3rem 0.65rem',
  borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
  cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
};
