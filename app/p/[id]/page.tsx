'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface PasteData {
  shortId:       string;
  title:         string;
  content:       string;
  language:      string;
  visibility:    string;
  burnAfterRead: boolean;
  expiresAt?:    string;
  views:         number;
  createdAt:     string;
}

// Validate shortId client-side before sending to the server
const VALID_ID = /^[a-zA-Z0-9_-]{6,16}$/;

export default function PasteViewPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [paste,         setPaste]         = useState<PasteData | null>(null);
  const [error,         setError]         = useState('');
  const [status,        setStatus]        = useState<'loading'|'password'|'ready'|'error'>('loading');
  const [password,      setPassword]      = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [copied,        setCopied]        = useState(false);
  const [showQR,        setShowQR]        = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [highlighting,    setHighlighting]    = useState(false);
  // Ref so password value is never stored in component state longer than needed
  const passwordRef = useRef('');

  // Reject obviously invalid IDs before hitting the network
  if (!VALID_ID.test(id ?? '')) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Navbar />
        <NotFound message="Invalid paste ID" router={router} />
      </div>
    );
  }

  const fetchPaste = useCallback(async (pwd?: string) => {
    const headers: HeadersInit = {};
    if (pwd) {
      // Cap password length client-side before sending
      headers['x-paste-password'] = pwd.slice(0, 128);
    }

    const res  = await fetch(`/api/pastes/${id}`, { headers, cache: 'no-store' });
    const data = await res.json();

    if (res.status === 429) {
      setError(data.error || 'Too many requests');
      setStatus('error');
      return;
    }
    if (res.status === 401 || res.status === 403) {
      if (data.requiresPassword) {
        setStatus('password');
        if (res.status === 403) setPasswordError('Incorrect password');
        return;
      }
    }
    if (!res.ok) {
      setError(data.error || 'Failed to load paste');
      setStatus('error');
      return;
    }

    // Clear the password from memory once the paste is loaded
    passwordRef.current = '';
    setPassword('');
    setPaste(data);
    setStatus('ready');
  }, [id]);

  useEffect(() => { fetchPaste(); }, [fetchPaste]);

   // Run client-side syntax highlighting using shiki once the paste is loaded
  useEffect(() => {
    let cancelled = false;

    async function runHighlight() {
      if (!paste) { setHighlightedHtml(null); return; }

      setHighlighting(true);
      try {
        const { codeToHtml } = await import('shiki');
        const lang = mapLanguageForShiki(paste.language);
        const html = await codeToHtml(paste.content, {
          lang,
          theme: 'github-dark-default',
        });

        if (!cancelled) setHighlightedHtml(html);
      } catch (err) {
        console.error('syntax highlight failed', err);
        if (!cancelled) setHighlightedHtml(null);
      } finally {
        if (!cancelled) setHighlighting(false);
      }
    }

    runHighlight();
    return () => { cancelled = true; };
  }, [paste]);

  function handlePasswordSubmit() {
    const pwd = password.trim();
    if (!pwd) return;
    setPasswordError('');
    passwordRef.current = pwd;
    fetchPaste(pwd);
  }

  async function copyContent() {
    if (!paste) return;
    await navigator.clipboard.writeText(paste.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadContent() {
    if (!paste) return;
    const extMap: Record<string, string> = {
      javascript:'js', typescript:'ts', python:'py', java:'java',
      go:'go', rust:'rs', bash:'sh', json:'json', html:'html',
      css:'css', markdown:'md', yaml:'yml', sql:'sql', cpp:'cpp',
    };
    const ext  = extMap[paste.language] || 'txt';
    const blob = new Blob([paste.content], { type: 'text/plain' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    // Sanitise title before using it as a filename
    const safe = (paste.title || paste.shortId).replace(/[^a-z0-9_\-. ]/gi, '_').slice(0, 80);
    a.download  = `${safe}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const url    = typeof window !== 'undefined' ? window.location.href : '';
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=8b83ff&bgcolor=16161f&data=${encodeURIComponent(url)}`;

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  const mapLanguageForShiki = (lang: string) => {
    const key = (lang || 'plaintext').toLowerCase();
    const map: Record<string, string> = {
      plaintext:'plaintext', text:'plaintext', txt:'plaintext',
      javascript:'javascript', js:'javascript',
      typescript:'typescript', ts:'typescript',
      python:'python', py:'python',
      java:'java', go:'go', rust:'rust',
      bash:'bash', sh:'bash', shell:'bash',
      json:'json', html:'html', css:'css',
      markdown:'markdown', md:'markdown',
      yaml:'yaml', yml:'yaml',
      sql:'sql',
      cpp:'cpp', 'c++':'cpp', c:'c',
      php:'php', ruby:'ruby',
    };
    return map[key] || 'plaintext';
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Navbar />
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh' }}>
          <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem' }}>
            <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>⏳</div>
            loading paste...
          </div>
        </div>
      </div>
    );
  }

  if (status === 'password') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Navbar />
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'70vh' }}>
          <div style={{
            background:'var(--bg-elevated)', border:'1px solid var(--border)',
            borderRadius:'16px', padding:'2rem', maxWidth:'380px', width:'90%', textAlign:'center',
          }} className="animate-fade-up">
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🔒</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'0.5rem' }}>
              Password Required
            </h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.82rem', marginBottom:'1.5rem' }}>
              This paste is protected.
            </p>
            <input
              type="password"
              placeholder="enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
              maxLength={128}
              autoComplete="off"
              style={{
                background:'var(--bg-surface)',
                border:`1px solid ${passwordError ? 'var(--red)' : 'var(--border)'}`,
                borderRadius:'8px', color:'var(--text-primary)', padding:'0.6rem 1rem',
                fontSize:'0.85rem', fontFamily:'var(--font-mono)', width:'100%',
                outline:'none', marginBottom:'0.5rem',
              }}
              aria-describedby={passwordError ? 'pwd-error' : undefined}
              autoFocus
            />
            {passwordError && (
              <p id="pwd-error" role="alert" style={{ color:'var(--red)', fontSize:'0.78rem', marginBottom:'0.75rem' }}>
                {passwordError}
              </p>
            )}
            <button onClick={handlePasswordSubmit} style={{
              background:'var(--accent)', color:'#fff', border:'none',
              padding:'0.6rem 1.5rem', borderRadius:'8px', fontSize:'0.85rem',
              fontFamily:'var(--font-mono)', cursor:'pointer', width:'100%', marginTop:'0.25rem',
            }}>
              unlock →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error' || !paste) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Navbar />
        <NotFound message={error} router={router} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <div style={{
        borderBottom:'1px solid var(--border)', padding:'1.25rem 1.5rem',
        background:'var(--bg-surface)', display:'flex', alignItems:'center',
        gap:'1rem', flexWrap:'wrap',
      }} className="animate-fade-up">
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily:'var(--font-display)', fontSize:'clamp(1rem,2.5vw,1.4rem)',
            fontWeight:700, letterSpacing:'-0.02em', marginBottom:'0.25rem',
          }}>
            {paste.title || <span style={{ color:'var(--text-muted)' }}>untitled paste</span>}
          </h1>
          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'center' }}>
            <span style={metaTag}>{paste.language}</span>
            <span style={metaTag}>{paste.visibility}</span>
            {paste.burnAfterRead && (
              <span style={{ ...metaTag, borderColor:'var(--red)', color:'var(--red)' }}>🔥 burned</span>
            )}
            {paste.expiresAt && (
              <span style={metaTag}>expires {new Date(paste.expiresAt).toLocaleDateString()}</span>
            )}
            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{timeAgo(paste.createdAt)}</span>
            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{paste.views} views</span>
          </div>
        </div>

        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          {/* <button onClick={copyContent} style={actionBtn(copied)}>
            {copied ? '✓ copied' : '⎘ copy'}
          </button> */}
          {/* <button onClick={copyLink} style={actionBtn(false)}>🔗 link</button> */}
          {/* <a
            href={`/api/raw/${paste.shortId}`}
            target="_blank"
            rel="noreferrer noopener"
            style={{ ...actionBtn(false), textDecoration:'none' }}
          >
            ⌥ raw
          </a> */}
          {/* <button onClick={downloadContent} style={actionBtn(false)}>↓ download</button> */}
          {/* <button onClick={() => setShowQR(!showQR)} style={actionBtn(showQR)}>▦ QR</button> */}
          <button
            onClick={() => router.push('/')}
            style={{ ...actionBtn(false), background:'var(--accent)', color:'#fff', borderColor:'var(--accent)' }}
          >
            + Create New
          </button>
        </div>
      </div>

      {showQR && (
        <div style={{
          padding:'1rem 1.5rem', borderBottom:'1px solid var(--border)',
          background:'var(--bg-elevated)', display:'flex', alignItems:'center', gap:'1rem',
        }} className="animate-fade-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR code for paste ${paste.shortId}`}
            style={{ borderRadius:'8px', border:'1px solid var(--border)' }}
            width={120} height={120}
          />
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'0.25rem' }}>
              Scan to share
            </div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', wordBreak:'break-all', maxWidth:'300px' }}>
              {url}
            </div>
          </div>
        </div>
      )}

      <div className="animate-fade-up-delay">
        <div style={{
          background:'var(--bg-elevated)', margin:'1.5rem',
          borderRadius:'12px', border:'1px solid var(--border)', overflow:'hidden',
        }}>
          <div style={{
            padding:'0.6rem 1rem', background:'var(--bg-overlay)',
            borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', gap:'0.5rem',
          }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--red)',    opacity:0.7 }} />
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--yellow)', opacity:0.7 }} />
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--green)',  opacity:0.7 }} />
            <span style={{ marginLeft:'0.5rem', fontSize:'0.72rem', color:'var(--text-muted)' }}>
              {(paste.title || 'paste').replace(/[^a-z0-9_\-. ]/gi,'_').slice(0,40)}
              .{paste.language === 'plaintext' ? 'txt' : paste.language}
            </span>
          </div>

          <div style={{ overflowX:'auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', minWidth:'100%' }}>
              <div style={{
                background:'var(--bg-surface)', borderRight:'1px solid var(--border)',
                padding:'0.75rem 0.75rem', textAlign:'right',
                fontFamily:'var(--font-mono)', fontSize:'0.78rem', color:'var(--text-muted)',
                minWidth:'54px', userSelect:'none', lineHeight:'1.7',
              }}>
                {paste.content.split('\n').map((_, i) => (
                  <div key={i} style={{ height:'1.7em' }}>{i + 1}</div>
                ))}
              </div>

              <div style={{ position:'relative', overflowX:'auto' }}>
                <div style={{ padding:'0.75rem 1rem' }}>
                  {highlightedHtml ? (
                    <div
                      className="shiki"
                      style={{ fontFamily:'var(--font-mono)', fontSize:'0.85rem', lineHeight:'1.7' }}
                      // Shiki returns escaped, styled HTML
                      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    />
                  ) : (
                    <pre style={{
                      margin:0, fontFamily:'var(--font-mono)', fontSize:'0.85rem', lineHeight:'1.7',
                      whiteSpace:'pre', color:'var(--text-primary)',
                    }}>
                      {paste.content || ' '}
                    </pre>
                  )}
                </div>
                {highlighting && !highlightedHtml && (
                  <div style={{ position:'absolute', top:8, right:12, fontSize:'0.75rem', color:'var(--text-muted)' }}>
                    highlighting…
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          margin:'0 1.5rem 1.5rem', padding:'0.75rem 1rem',
          background:'var(--bg-surface)', borderRadius:'8px',
          border:'1px solid var(--border)',
          display:'flex', gap:'1.5rem', flexWrap:'wrap',
          fontSize:'0.75rem', color:'var(--text-muted)',
        }}>
          <span>{paste.content.split('\n').length} lines</span>
          <span>{paste.content.length.toLocaleString()} chars</span>
          <span>{(new TextEncoder().encode(paste.content).length / 1024).toFixed(1)} KB</span>
          <span>created {new Date(paste.createdAt).toLocaleString()}</span>
          {paste.expiresAt && <span>expires {new Date(paste.expiresAt).toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}

function NotFound({ message, router }: { message: string; router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }} className="animate-fade-up">
        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>
          {message?.includes('expired') ? '⌛' : message?.includes('destroyed') ? '💥' : '🌑'}
        </div>
        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'0.5rem' }}>
          {message || 'Not Found'}
        </h2>
        <p style={{ color:'var(--text-secondary)', fontSize:'0.85rem', marginBottom:'1.5rem' }}>
          {message?.includes('destroyed') ? 'This paste was set to burn after reading.' :
           message?.includes('expired')   ? 'This paste has passed its expiration time.' :
           'This paste does not exist.'}
        </p>
        <button onClick={() => router.push('/')} style={{
          background:'var(--accent)', color:'#fff', border:'none',
          padding:'0.6rem 1.5rem', borderRadius:'8px', fontSize:'0.85rem',
          fontFamily:'var(--font-mono)', cursor:'pointer',
        }}>
          create new paste →
        </button>
      </div>
    </div>
  );
}

const metaTag: React.CSSProperties = {
  fontSize:'0.7rem', padding:'0.15rem 0.5rem',
  border:'1px solid var(--border)', borderRadius:'4px',
  color:'var(--text-muted)', fontFamily:'var(--font-mono)',
};
const actionBtn = (active: boolean): React.CSSProperties => ({
  background: active ? 'var(--accent-glow)' : 'var(--bg-elevated)',
  color:      active ? 'var(--accent-bright)' : 'var(--text-secondary)',
  border:     `1px solid ${active ? 'var(--accent-dim)' : 'var(--border)'}`,
  padding:'0.35rem 0.75rem', borderRadius:'6px', fontSize:'0.75rem',
  fontFamily:'var(--font-mono)', cursor:'pointer', transition:'all 0.15s',
  textDecoration:'none', display:'inline-block',
});
