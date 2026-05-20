import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { RegisterSchema } from '@/lib/validation';
import { registerLimiter, getClientIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = registerLimiter(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // ── Parse & validate body ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { email, username, password } = parsed.data;

  try {
    await connectDB();

    // ── Timing-safe duplicate check ───────────────────────────────────────
    // Always hash regardless of whether user exists to prevent timing oracle.
    const [existing, passwordHash] = await Promise.all([
      User.findOne({ $or: [{ email }, { username }] }).select('_id').lean(),
      bcrypt.hash(password, 12),
    ]);

    if (existing) {
      // Generic message — don't reveal which field was taken
      return NextResponse.json(
        { error: 'Unable to create account. Please try different credentials.' },
        { status: 409 }
      );
    }

    await User.create({ email, username, passwordHash });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
