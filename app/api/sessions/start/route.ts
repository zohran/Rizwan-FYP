import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Session, BillingRate, User } from '@/models';
import { getAuth } from '@/lib/get-auth';
import { startSessionSchema } from '@/lib/validation';
import { ALLOWED_DURATIONS } from '@/lib/constants';
import { emitToAdmins, SOCKET_EVENTS } from '@/lib/socket';
import { createAlert } from '@/lib/create-alert';
import { apiError, apiValidationError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = startSessionSchema.safeParse({
      ...body,
      duration: body.duration ? Number(body.duration) : body.duration,
    });

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten(), 400);
    }

    const { duration, machineId, imageUrl } = parsed.data;

    if (!ALLOWED_DURATIONS.includes(duration as 30 | 60 | 90)) {
      return NextResponse.json(
        { error: 'Duration must be 30, 60, or 90 minutes' },
        { status: 400 }
      );
    }

    await connectDB();

    const activeSession = await Session.findOne({
      userId: auth.userId,
      status: 'active',
    });

    if (activeSession) {
      const user = await User.findById(auth.userId).select('username').lean();
      await createAlert({
        type: 'suspicious_session',
        userId: auth.userId,
        message: `User ${user?.username ?? auth.userId} attempted to start a second session while one was already active (concurrent session attempt).`,
      });
      return NextResponse.json(
        { error: 'You already have an active session' },
        { status: 400 }
      );
    }

    const rateDoc = await BillingRate.findOne().sort({ updatedAt: -1 });
    const ratePerMinute = rateDoc?.ratePerMinute ?? 1;

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const session = await Session.create({
      userId: auth.userId,
      machineId,
      imageUrl: imageUrl ?? '',
      startTime,
      endTime,
      selectedDuration: duration,
      remainingTime: duration * 60,
      status: 'active',
      billingAmount: 0,
    });

    emitToAdmins(SOCKET_EVENTS.SESSION_START, {
      sessionId: session._id,
      userId: auth.userId,
      machineId: session.machineId,
      startTime: session.startTime,
      duration,
      imageUrl: session.imageUrl,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session._id,
        startTime: session.startTime,
        endTime: session.endTime,
        remainingTime: duration * 60,
        duration,
        ratePerMinute,
      },
    });
  } catch (err) {
    console.error('Start session error:', err);
    return apiError('Failed to start session', 500);
  }
}
