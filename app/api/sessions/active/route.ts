import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Session, Billing, BillingRate, Log } from '@/models';
import { getAuth } from '@/lib/get-auth';
import { calculateBilling } from '@/lib/billing';
import { DEFAULT_RATE_PER_MINUTE } from '@/lib/constants';
import { emitToAdmins, SOCKET_EVENTS } from '@/lib/socket';
import { apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const session = await Session.findOne({
      userId: auth.userId,
      status: 'active',
    }).populate('userId', 'username');

    if (!session) {
      return NextResponse.json({ session: null });
    }

    const now = new Date();

    // Handle abrupt disconnect: auto-end expired sessions and create billing
    if (session.endTime.getTime() <= now.getTime()) {
      const totalMinutes = Math.ceil(
        (now.getTime() - session.startTime.getTime()) / 60000
      );
      const rateDoc = await BillingRate.findOne().sort({ updatedAt: -1 });
      const ratePerMinute = rateDoc?.ratePerMinute ?? DEFAULT_RATE_PER_MINUTE;
      const totalAmount = calculateBilling(totalMinutes, ratePerMinute);

      await Session.updateOne(
        { _id: session._id },
        { status: 'ended', remainingTime: 0, billingAmount: totalAmount }
      );
      await Billing.create({
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
        eventType: 'session_expired',
      });
      emitToAdmins(SOCKET_EVENTS.BILLING_UPDATE, { sessionId: session._id });
      return NextResponse.json({ session: null });
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((session.endTime.getTime() - now.getTime()) / 1000)
    );

    return NextResponse.json({
      session: {
        id: session._id,
        startTime: session.startTime,
        endTime: session.endTime,
        remainingTime: remainingSeconds,
        duration: session.selectedDuration,
        machineId: session.machineId,
        imageUrl: session.imageUrl,
      },
    });
  } catch (err) {
    console.error('Get active session error:', err);
    return apiError('Failed to get session', 500);
  }
}
