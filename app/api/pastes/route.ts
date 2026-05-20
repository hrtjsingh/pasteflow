import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Paste from '@/models/Paste';
import { CreatePasteSchema } from '@/lib/validation';
import { pasteCreateLimiter, getClientIp } from '@/lib/rateLimit';

const EXPIRATION_MS: Record<string, number | null> = {
  never: null,
  '1h':  60 * 60 * 1000,
  '1d':  24 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
};

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = pasteCreateLimiter(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many pastes created. Slow down.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  // ── Parse & validate ───────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CreatePasteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { title, content, language, visibility, expiration, password, burnAfterRead } =
    parsed.data;

  // ── Byte-level size check (protects against multi-byte char tricks) ────────
  if (Buffer.byteLength(content, 'utf8') > 512_000) {
    return NextResponse.json({ error: 'Content exceeds 500 KB limit' }, { status: 413 });
  }

  // ── Private paste must have a password ────────────────────────────────────
  if (visibility === 'private' && !password) {
    return NextResponse.json(
      { error: 'A password is required for private pastes' },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    // Expiration
    let expiresAt: Date | undefined;
    if (!burnAfterRead && expiration !== 'never') {
      const ms = EXPIRATION_MS[expiration];
      if (ms) expiresAt = new Date(Date.now() + ms);
    }

    // Password hash
    let passwordHash: string | undefined;
    if (visibility === 'private' && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const paste = await Paste.create({
      shortId:       nanoid(10),        // increased from 8 → 10 for more entropy
      title:         title.slice(0, 200).trim(),
      content,
      language,
      visibility,
      passwordHash,
      expiresAt,
      burnAfterRead,
      burned:        false,
      authorId:      (session?.user as any)?.id ?? null,
    });

    return NextResponse.json({
      success: true,
      shortId: paste.shortId,
      url:     `/p/${paste.shortId}`,
    });
  } catch (err) {
    console.error('[paste:create]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Explicit field allowlist — never return passwordHash
    const pastes = await Paste.find({ authorId: userId })
      .sort({ createdAt: -1 })
      .select('shortId title language visibility views burnAfterRead expiresAt createdAt')
      .limit(50)
      .lean();

    return NextResponse.json({ pastes });
  } catch (err) {
    console.error('[paste:list]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
