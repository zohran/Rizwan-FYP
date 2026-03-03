import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Session, Billing, BillingRate, Log } from '@/models';
import { requireAdmin } from '@/lib/get-auth';
import { emitToUser, emitToAdmins, SOCKET_EVENTS } from '@/lib/socket';
import { calculateBilling } from '@/lib/billing';
import { DEFAULT_RATE_PER_MINUTE } from '@/lib/constants';
import { terminateSessionSchema } from '@/lib/validation';
import { apiError, apiValidationError } from '@/lib/api-response';
import { validateCsrf } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return apiError('Invalid request origin', 403);
    }

    const unauth = await requireAdmin();
    if (unauth) return unauth;

    const body = await request.json().catch(() => ({}));
    const parsed = terminateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten(), 400);
    }
    const { sessionId } = parsed.data;

    await connectDB();

    const session = await Session.findById(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      );
    }

    const now = new Date();
    const totalMinutes = Math.ceil(
      (now.getTime() - session.startTime.getTime()) / 60000
    );
    const rateDoc = await BillingRate.findOne().sort({ updatedAt: -1 });
    const ratePerMinute = rateDoc?.ratePerMinute ?? DEFAULT_RATE_PER_MINUTE;
    const totalAmount = calculateBilling(totalMinutes, ratePerMinute);

    await Session.updateOne(
      { _id: session._id },
      {
        status: 'terminated',
        remainingTime: 0,
        billingAmount: totalAmount,
      }
    );

    await Billing.create({
      sessionId: session._id,
      userId: session.userId,
      ratePerMinute,
      totalMinutes,
      totalAmount,
    });

    await Log.create({
      userId: session.userId,
      loginTime: session.startTime,
      logoutTime: now,
      duration: totalMinutes,
      machineId: session.machineId,
      billingAmount: totalAmount,
      imageUrl: session.imageUrl,
      eventType: 'session_terminated',
    });

    emitToUser(session.userId.toString(), SOCKET_EVENTS.SESSION_TERMINATE, {
      sessionId: session._id,
      totalAmount,
    });
    emitToAdmins(SOCKET_EVENTS.BILLING_UPDATE, { sessionId: session._id });

    return NextResponse.json({
      success: true,
      session: {
        id: session._id,
        status: 'terminated',
        totalAmount,
      },
    });
  } catch (err) {
    console.error('Terminate session error:', err);
    return apiError('Failed to terminate session', 500);
  }
}
