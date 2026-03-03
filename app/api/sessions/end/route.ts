import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Session, Billing, BillingRate, Log, User } from '@/models';
import { getAuth } from '@/lib/get-auth';
import { calculateBilling } from '@/lib/billing';
import { DEFAULT_RATE_PER_MINUTE } from '@/lib/constants';
import { createAlert } from '@/lib/create-alert';
import { emitToAdmins, SOCKET_EVENTS } from '@/lib/socket';
import { apiError } from '@/lib/api-response';

const SHORT_SESSION_THRESHOLD_MINUTES = 2;

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const session = await Session.findOne({
      userId: auth.userId,
      status: 'active',
    });

    if (!session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const totalMinutes = Math.ceil(
      (now.getTime() - session.startTime.getTime()) / 60000
    );

    if (totalMinutes < SHORT_SESSION_THRESHOLD_MINUTES) {
      const user = await User.findById(auth.userId).select('username').lean();
      await createAlert({
        type: 'suspicious_session',
        userId: auth.userId,
        message: `User ${user?.username ?? auth.userId} ended session after only ${totalMinutes} minute(s) (machine: ${session.machineId}). May indicate probe or accidental use.`,
      });
    }

    const rateDoc = await BillingRate.findOne().sort({ updatedAt: -1 });
    const ratePerMinute = rateDoc?.ratePerMinute ?? DEFAULT_RATE_PER_MINUTE;
    const totalAmount = calculateBilling(totalMinutes, ratePerMinute);

    await Session.updateOne(
      { _id: session._id },
      {
        status: 'ended',
        remainingTime: 0,
        billingAmount: totalAmount,
      }
    );

    const billing = await Billing.create({
      sessionId: session._id,
      userId: auth.userId,
      ratePerMinute,
      totalMinutes,
      totalAmount,
    });

    await Log.create({
      userId: auth.userId,
      loginTime: session.startTime,
      logoutTime: now,
      duration: totalMinutes,
      machineId: session.machineId,
      billingAmount: totalAmount,
      imageUrl: session.imageUrl,
      eventType: 'session_ended',
    });

    emitToAdmins(SOCKET_EVENTS.BILLING_UPDATE, { sessionId: session._id });

    return NextResponse.json({
      success: true,
      billing: {
        totalMinutes,
        totalAmount,
      },
    });
  } catch (err) {
    console.error('End session error:', err);
    return apiError('Failed to end session', 500);
  }
}
