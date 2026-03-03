import { NextRequest, NextResponse } from 'next/server';
import { checkLoginRateLimit } from '@/lib/rate-limit';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models';
import { comparePassword, generateAccessToken, createAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { BLOCK_DURATION_MINUTES, MAX_FAILED_ATTEMPTS } from '@/lib/constants';
import { createAlert } from '@/lib/create-alert';
import { apiError, apiValidationError } from '@/lib/api-response';
import { validateCsrf } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return apiError('Invalid request origin', 403);
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
    const rateLimit = checkLoginRateLimit(ip);
    if (!rateLimit.allowed) {
      return apiError(
        'Too many login attempts. Try again later.',
        429,
        { retryAfter: rateLimit.retryAfterSeconds }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten(), 400);
    }

    const { username, password } = parsed.data;

    await connectDB();

    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (user.role !== 'client') {
      return NextResponse.json(
        { error: 'Access denied. Client login only.' },
        { status: 403 }
      );
    }

    if (user.isBlocked && user.blockUntil && new Date() < user.blockUntil) {
      const remaining = Math.ceil((user.blockUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Account blocked. Try again in ${remaining} minutes.` },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      const newAttempts = (user.failedAttempts ?? 0) + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const blockUntil = new Date();
        blockUntil.setMinutes(blockUntil.getMinutes() + BLOCK_DURATION_MINUTES);

        await User.updateOne(
          { _id: user._id },
          {
            failedAttempts: newAttempts,
            isBlocked: true,
            blockUntil,
          }
        );

        await createAlert({
          type: 'blocked_login',
          userId: user._id,
          message: `User ${username} blocked after ${MAX_FAILED_ATTEMPTS} failed login attempts.`,
        });

        return NextResponse.json(
          { error: `Too many failed attempts. Account blocked for ${BLOCK_DURATION_MINUTES} minutes.` },
          { status: 403 }
        );
      }

      await User.updateOne(
        { _id: user._id },
        { failedAttempts: newAttempts }
      );

      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    await User.updateOne(
      { _id: user._id },
      {
        failedAttempts: 0,
        isBlocked: false,
        blockUntil: null,
      }
    );

    const token = generateAccessToken(user._id.toString(), user.role);
    const cookie = createAuthCookie(token);

    const response = NextResponse.json({
      success: true,
      user: { id: user._id, username: user.username, role: user.role },
    });

    response.headers.set('Set-Cookie', cookie);

    return response;
  } catch (err) {
    console.error('Client login error:', err);
    return apiError('Authentication failed', 500);
  }
}
