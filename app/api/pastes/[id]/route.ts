import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Paste from '@/models/Paste';
import { ShortIdSchema, PastePasswordSchema } from '@/lib/validation';
import { pasteReadLimiter, passwordLimiter, getClientIp } from '@/lib/rateLimit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Validate ID param ──────────────────────────────────────────────────────
  const { id } = await params;
  const idParsed = ShortIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: 'Invalid paste ID' }, { status: 400 });
  }
  const shortId = idParsed.data;

  // ── Rate limit reads ───────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const readRl = pasteReadLimiter(ip);
  if (!readRl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    await connectDB();

    // Explicit field selection — never return passwordHash to client
    const paste = await Paste.findOne({ shortId })
      .select('shortId title content language visibility passwordHash burnAfterRead burned expiresAt views createdAt authorId')
      .lean();

    if (!paste) {
      return NextResponse.json({ error: 'Paste not found' }, { status: 404 });
    }
    if (paste.burned) {
      return NextResponse.json({ error: 'This paste has been destroyed' }, { status: 410 });
    }
    if (paste.expiresAt && paste.expiresAt < new Date()) {
      // Belt + suspenders alongside MongoDB TTL index
      await Paste.deleteOne({ shortId });
      return NextResponse.json({ error: 'Paste has expired' }, { status: 410 });
    }

    // ── Password verification ────────────────────────────────────────────────
    if (paste.visibility === 'private') {
      // Brute-force protection on password attempts
      const pwRl = passwordLimiter(shortId, ip);
      if (!pwRl.allowed) {
        return NextResponse.json(
          { error: 'Too many password attempts. Try again later.', requiresPassword: true },
          {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil((pwRl.resetAt - Date.now()) / 1000)) },
          }
        );
      }

      const rawPassword = req.headers.get('x-paste-password') ?? '';
      const pwParsed = PastePasswordSchema.safeParse(rawPassword);
      if (!pwParsed.success || !rawPassword) {
        return NextResponse.json(
          { error: 'Password required', requiresPassword: true },
          { status: 401 }
        );
      }

      const valid = await bcrypt.compare(rawPassword, paste.passwordHash!);
      if (!valid) {
        return NextResponse.json(
          { error: 'Incorrect password', requiresPassword: true },
          { status: 403 }
        );
      }
    }

    // ── Determine ownership (authors shouldn't consume burn/views) ───────────
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const isOwner = paste.authorId && userId && paste.authorId.toString() === userId;

    // ── Burn after read — atomic update (skip for owner) ──────────────────────
    // Using findOneAndUpdate with a condition prevents double-delivery in
    // race conditions (two simultaneous requests for the same burn paste).
    if (paste.burnAfterRead && !isOwner) {
      const updated = await Paste.findOneAndUpdate(
        { shortId, burned: false },   // condition: only if NOT already burned
        { $set: { burned: true } },
        { new: false }
      );
      if (!updated) {
        // A concurrent request already burned it
        return NextResponse.json({ error: 'This paste has been destroyed' }, { status: 410 });
      }
    }

    // ── Increment view count (skip for owner when burn is enabled) ────────────
    const shouldIncrementView = !(paste.burnAfterRead && isOwner);
    if (shouldIncrementView) {
      await Paste.updateOne({ shortId }, { $inc: { views: 1 } });
    }

    // ── Return only safe fields (never return passwordHash) ───────────────────
    return NextResponse.json({
      shortId:       paste.shortId,
      title:         paste.title,
      content:       paste.content,
      language:      paste.language,
      visibility:    paste.visibility,
      burnAfterRead: paste.burnAfterRead,
      expiresAt:     paste.expiresAt,
      views:         (paste.views ?? 0) + (shouldIncrementView ? 1 : 0),
      createdAt:     paste.createdAt,
    });
  } catch (err) {
    console.error('[paste:get]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Validate ID param ──────────────────────────────────────────────────────
  const { id } = await params;
  const idParsed = ShortIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: 'Invalid paste ID' }, { status: 400 });
  }

  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    // ── Ownership enforcement ─────────────────────────────────────────────────
    // SECURITY FIX: Previously anyone who knew a shortId could delete it.
    // Now only the authenticated author can delete their own pastes.
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paste = await Paste.findOneAndDelete({
      shortId:  idParsed.data,
      authorId: userId,             // ← ownership check
    });

    if (!paste) {
      return NextResponse.json(
        { error: 'Not found or not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[paste:delete]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
