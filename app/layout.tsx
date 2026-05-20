import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

// Dev-only Fast Refresh shim for CSP-strict environments where ReactFreshWebpackPlugin is disabled
const devRefreshShim = `
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Define Fast Refresh globals if missing to prevent ReferenceError ($RefreshSig$, $RefreshReg$)
    window.$RefreshSig$ = window.$RefreshSig$ || function() { return function(type) { return type; }; };
    window.$RefreshReg$ = window.$RefreshReg$ || function() {};
  }
`;

export const metadata: Metadata = {
  title: 'PasteFlow — Share text instantly',
  description: 'The fastest way to share text, code, and notes online.',
  icons: {
    icon: '/heart.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === 'development' ? (
          <script dangerouslySetInnerHTML={{ __html: devRefreshShim }} />
        ) : null}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
