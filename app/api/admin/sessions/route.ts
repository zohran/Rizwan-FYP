import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Session, BillingRate } from '@/models';
import { requireAdmin } from '@/lib/get-auth';
import { calculateBilling } from '@/lib/billing';
import { DEFAULT_RATE_PER_MINUTE } from '@/lib/constants';

export async function GET() {
  try {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    await connectDB();

    const sessions = await Session.find({ status: 'active' })
      .populate('userId', 'username')
      .lean();

    const rateDoc = await BillingRate.findOne().sort({ updatedAt: -1 });
    const ratePerMinute = rateDoc?.ratePerMinute ?? DEFAULT_RATE_PER_MINUTE;

    const now = new Date();
    const enriched = sessions.map((s) => {
      const startTime = s.startTime as Date;
      const remainingSeconds = Math.max(
        0,
        Math.floor((s.endTime.getTime() - now.getTime()) / 1000)
      );
      const elapsedMinutes = Math.ceil(
        (now.getTime() - startTime.getTime()) / 60000
      );
      const liveBilling = calculateBilling(elapsedMinutes, ratePerMinute);

      return {
        id: s._id,
        username: (s.userId as { username: string })?.username ?? 'Unknown',
        machineId: s.machineId,
        imageUrl: s.imageUrl,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.selectedDuration,
        remainingTime: remainingSeconds,
        liveBilling,
      };
    });

    return NextResponse.json({ sessions: enriched });
  } catch (err) {
    console.error('Admin sessions error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
