'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';

const LANGUAGES = [
  'plaintext','javascript','typescript','python','java','go','rust',
  'bash','json','html','css','markdown','yaml','sql','cpp','c','php','ruby',
];
const EXPIRATIONS = [
  { value: 'never', label: '∞ never' },
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
  { value: '7d', label: '7 days' },
];

export default function HomePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [visibility, setVisibility] = useState<'public'|'unlisted'|'private'>('unlisted');
  const [expiration, setExpiration] = useState('never');
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareInfo, setShareInfo] = useState<{ shortId: string; url: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const canNativeShare = typeof navigator !== 'undefined'
    && typeof (navigator as Navigator & { share?: Navigator['share'] }).share === 'function';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const charCount = content.length;
  const byteCount = new TextEncoder().encode(content).length;
  const maxBytes = 500 * 1024;

  async function handleSubmit() {
    if (!content.trim()) { setError('Content cannot be empty'); return; }
    if (byteCount > maxBytes) { setError('Content exceeds 500 KB'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/pastes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, language, visibility, expiration, burnAfterRead, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create paste'); return; }
      const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
      const url  = `${base}/p/${data.shortId}`;
      setShareInfo({ shortId: data.shortId, url });
      setCopiedLink(false);
      setShowQR(false);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  async function copyShareLink() {
    if (!shareInfo) return;
    await navigator.clipboard.writeText(shareInfo.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  }

  async function nativeShare() {
    if (!shareInfo || !canNativeShare) return;
    const shareFn = (navigator as Navigator & { share: Navigator['share'] }).share;
    try {
      await shareFn({ title: shareInfo.shortId, url: shareInfo.url });
    } catch (err) {
      console.error('Share cancelled or failed', err);
    }
  }

  const shareQrUrl = shareInfo
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=8b83ff&bgcolor=16161f&data=${encodeURIComponent(shareInfo.url)}`
    : '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <div style={{
        textAlign: 'center', padding: '3rem 1.5rem 2rem',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, rgba(108,99,255,0.04) 0%, transparent 100%)',
      }} className="animate-fade-up">
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: '100px', padding: '0.25rem 0.75rem',
          fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '1rem',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          instant sharing · no account required
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1,
          marginBottom: '0.75rem',
        }}>
          Share text at the<br />
          <span style={{
            background: 'linear-gradient(90deg, var(--accent) 0%, var(--cyan) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>speed of thought</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
          Code, notes, logs — paste it, share it. Expires automatically.
        </p>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }} className="animate-fade-up-delay">
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input name="title" type="text" placeholder="title (optional)" value={title}
            onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: '200px' }} />
          <select id="language" className='capitalize' value={language} onChange={e => setLanguage(e.target.value)} style={selectStyle}>
            {LANGUAGES.map(l => <option key={l} value={l} className='capitalize'>{l}</option>)}
          </select>
        </div>

        <div style={{ position: 'relative' }}>
          <textarea
            placeholder="// paste your code, notes, or text here..."
            value={content} onChange={e => setContent(e.target.value)}
            style={{ ...textareaStyle, borderColor: byteCount > maxBytes ? 'var(--red)' : content ? 'var(--border-focus)' : 'var(--border)' }}
            rows={18} spellCheck={false}
          />
          <div style={{ position: 'absolute', bottom: '0.75rem', right: '1rem',
            fontSize: '0.7rem', color: byteCount > maxBytes ? 'var(--red)' : 'var(--text-muted)' }}>
            {charCount.toLocaleString()} chars · {(byteCount / 1024).toFixed(1)} KB / 500 KB
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={optionGroup}>
            <span style={optionLabel}>visibility</span>
            <div style={segmentGroup}>
              {(['public','unlisted','private'] as const).map(v => (
                <button key={v} onClick={() => setVisibility(v)} style={segmentBtn(visibility === v)}>
                  {v === 'public' ? '🌐' : v === 'unlisted' ? '🔗' : '🔒'} {v}
                </button>
              ))}
            </div>
          </div>

          <div style={optionGroup}>
            <span style={optionLabel}>expires</span>
            <select value={expiration} onChange={e => setExpiration(e.target.value)}
              disabled={burnAfterRead} style={selectStyle}>
              {EXPIRATIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', paddingBottom: '2px' }}>
            <div onClick={() => setBurnAfterRead(!burnAfterRead)} style={{
              width: '36px', height: '20px', borderRadius: '10px',
              background: burnAfterRead ? 'var(--red)' : 'var(--bg-overlay)',
              border: `1px solid ${burnAfterRead ? 'var(--red)' : 'var(--border)'}`,
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: '2px', left: burnAfterRead ? '18px' : '2px',
                width: '14px', height: '14px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </div>
            <span style={{ fontSize: '0.78rem', color: burnAfterRead ? 'var(--red)' : 'var(--text-secondary)' }}>
              🔥 burn after read
            </span>
          </label>
        </div>

        {visibility === 'private' && (
          <div style={{ marginTop: '0.75rem' }}>
            <input type="password" placeholder="set a password for this paste"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ ...inputStyle, maxWidth: '320px' }} />
          </div>
        )}

        {error && (
          <div style={{
            marginTop: '0.75rem', padding: '0.6rem 1rem',
            background: 'rgba(255,95,109,0.08)', border: '1px solid rgba(255,95,109,0.3)',
            borderRadius: '8px', color: 'var(--red)', fontSize: '0.82rem',
          }}>{error}</div>
        )}

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleSubmit}
            disabled={loading || !content.trim() || byteCount > maxBytes}
            style={{
              background: loading ? 'var(--accent-dim)' : 'var(--accent)',
              color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '8px',
              fontSize: '0.88rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.02em',
              transition: 'opacity 0.15s',
            }}>
            {loading ? '⏳ Creating...' : '→ Share Paste'}
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            anonymous · instant · no account needed
          </span>
        </div>
      </div>

      <footer style={{
        borderTop: '1px solid var(--border)', padding: '1.5rem',
        textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem',
      }}>
        pasteflow · share text instantly · built with next.js + mongodb
      </footer>

      {shareInfo && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          backdropFilter: 'blur(6px)', padding: '1rem',
        }}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '14px',
            padding: '1.5rem', width: 'min(520px, 96vw)', color: 'var(--text-primary)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)', position: 'relative',
          }} className="animate-fade-up">
            <button
              onClick={() => setShareInfo(null)}
              aria-label="Close"
              style={{
                position: 'absolute', top: '10px', right: '10px', border: 'none',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: '1.1rem', padding: '0.25rem',
              }}
            >
              ×
            </button>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{
                width: 42, height: 42, borderRadius: '10px',
                background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                display: 'grid', placeItems: 'center', fontSize: '1.1rem',
              }}>
                🔗
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem' }}>
                  Paste created
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Share without leaving this page.
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '0.85rem 1rem', marginBottom: '1rem', wordBreak: 'break-all',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{shareInfo.url}</div>
              <button onClick={copyShareLink} style={smallBtn(copiedLink)}>
                {copiedLink ? '✓ copied' : '⎘ copy link'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={copyShareLink} style={primaryBtn}>Copy link</button>
              {canNativeShare && (
                <button onClick={nativeShare} style={secondaryBtn}>Share…</button>
              )}
              <button onClick={() => setShowQR(!showQR)} style={{ ...secondaryBtn, background: showQR ? 'var(--accent-glow)' : 'var(--bg-elevated)' }}>
                {showQR ? 'Hide QR' : 'Show QR'}
              </button>
              {/* <a
                href={`/p/${shareInfo.shortId}`}
                target="_blank"
                rel="noreferrer noopener"
                style={{ ...secondaryBtn, textDecoration: 'none' }}
              >
                Open paste ↗
              </a> */}
            </div>

            {showQR && shareQrUrl && (
              <div style={{
                marginTop: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '10px',
                display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-surface)',
              }} className="animate-fade-up">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shareQrUrl} alt={`QR for ${shareInfo.shortId}`} width={140} height={140}
                  style={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Scan to share</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '260px', wordBreak: 'break-all' }}>
                    {shareInfo.url}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text-primary)', padding: '0.55rem 0.9rem', fontSize: '0.82rem',
  fontFamily: 'var(--font-mono)', outline: 'none', width: '100%', transition: 'border-color 0.15s',
};
const selectStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text-secondary)', padding: '0.55rem 0.9rem', fontSize: '0.82rem',
  fontFamily: 'var(--font-mono)', outline: 'none', cursor: 'pointer',
};
const textareaStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px',
  color: 'var(--text-primary)', padding: '1rem 1.25rem', fontSize: '0.85rem',
  fontFamily: 'var(--font-mono)', lineHeight: '1.7', resize: 'vertical', outline: 'none',
  transition: 'border-color 0.2s', minHeight: '300px', display: 'block', caretColor: 'var(--accent)',
};
const optionGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.3rem' };
const optionLabel: React.CSSProperties = {
  fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
};
const segmentGroup: React.CSSProperties = {
  display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden',
};
const segmentBtn = (active: boolean): React.CSSProperties => ({
  background: active ? 'var(--accent)' : 'var(--bg-elevated)',
  color: active ? '#fff' : 'var(--text-secondary)', border: 'none',
  padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
  cursor: 'pointer', borderRight: '1px solid var(--border)', transition: 'background 0.15s',
});
const primaryBtn: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)',
  padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)',
  cursor: 'pointer', transition: 'opacity 0.15s',
};
const secondaryBtn: React.CSSProperties = {
  background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)',
  padding: '0.55rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)',
  cursor: 'pointer', transition: 'opacity 0.15s',
};
const smallBtn = (active: boolean): React.CSSProperties => ({
  background: active ? 'var(--accent-glow)' : 'var(--bg-overlay)',
  color: active ? 'var(--accent-bright)' : 'var(--text-secondary)',
  border: `1px solid ${active ? 'var(--accent-dim)' : 'var(--border)'}`,
  padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', cursor: 'pointer',
});
