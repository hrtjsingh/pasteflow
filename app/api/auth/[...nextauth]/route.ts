import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { loginLimiter, getClientIp } from '@/lib/rateLimit';

// Dummy hash used for timing-safe "user not found" path.
// Pre-computed so the cost is identical whether user exists or not.
const DUMMY_HASH = '$2a$12$IfYbPMl5GlMuBPCL5XwBmuBqGbWLj.AZqZ.FqYpT4X5SvH7c.jEgm';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // ── Rate limiting via forwarded IP ──────────────────────────────
        // `req` here is the raw NextAuth InternalRequest; headers are available.
        const ip =
          (req?.headers as any)?.['cf-connecting-ip'] ||
          (req?.headers as any)?.['x-real-ip'] ||
          (req?.headers as any)?.['x-forwarded-for']?.split(',')[0]?.trim() ||
          'unknown';

        const rl = loginLimiter(ip);
        if (!rl.allowed) {
          // Throw so NextAuth surfaces a sign-in error rather than crashing
          throw new Error('TOO_MANY_ATTEMPTS');
        }

        await connectDB();

        // ── Timing-safe authentication ─────────────────────────────────
        // Always run bcrypt.compare — even if user not found — to prevent
        // timing-based username enumeration.
        const user = await User.findOne({ email: credentials.email.toLowerCase() })
          .select('+passwordHash')
          .lean();

        const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
        const valid = await bcrypt.compare(credentials.password, hashToCompare);

        if (!user || !valid) return null;

        return {
          id:    user._id.toString(),
          email: user.email,
          name:  user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  // Prevent detailed error messages leaking to the client
  debug: false,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
