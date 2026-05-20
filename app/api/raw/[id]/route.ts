import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Paste from '@/models/Paste';
import { ShortIdSchema } from '@/lib/validation';
import { pasteReadLimiter, getClientIp } from '@/lib/rateLimit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Validate ID ────────────────────────────────────────────────────────────
  const { id } = await params;
  const idParsed = ShortIdSchema.safeParse(id);
  if (!idParsed.success) {
    return new NextResponse('Invalid paste ID', { status: 400 });
  }

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = pasteReadLimiter(ip);
  if (!rl.allowed) {
    return new NextResponse('Too many requests', { status: 429 });
  }

  try {
    await connectDB();
    const paste = await Paste.findOne({ shortId: idParsed.data })
      .select('content visibility burned expiresAt burnAfterRead')
      .lean();

    if (!paste || paste.burned) {
      return new NextResponse('Paste not found or destroyed', { status: 404 });
    }
    if (paste.visibility === 'private') {
      return new NextResponse('Forbidden', { status: 403 });
    }
    if (paste.burnAfterRead) {
      // Raw endpoint must not be used to trigger burn (use the web UI)
      return new NextResponse('Burn-after-read pastes cannot be accessed via raw endpoint', { status: 403 });
    }
    if (paste.expiresAt && paste.expiresAt < new Date()) {
      return new NextResponse('Paste has expired', { status: 410 });
    }

    return new NextResponse(paste.content, {
      headers: {
        'Content-Type':              'text/plain; charset=utf-8',
        'X-Content-Type-Options':    'nosniff',
        // Prevent browsers from rendering this as HTML (XSS vector)
        'Content-Disposition':       'inline',
        // No caching for raw pastes — they can be burned or expired
        'Cache-Control':             'no-store',
      },
    });
  } catch (err) {
    console.error('[raw:get]', err);
    return new NextResponse('Server error', { status: 500 });
  }
}
