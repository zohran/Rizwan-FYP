import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Billing } from '@/models';
import { getAuth } from '@/lib/get-auth';

/** Client's own billing history + total owed */
export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const [billings, aggregation] = await Promise.all([
      Billing.find({ userId: auth.userId })
        .sort({ createdAt: -1 })
        .lean(),
      Billing.aggregate([
        { $match: { userId: auth.userId } },
        { $group: { _id: null, totalAmount: { $sum: '$totalAmount' }, totalMinutes: { $sum: '$totalMinutes' }, count: { $sum: 1 } } },
      ]),
    ]);

    const summary = aggregation[0] ?? { totalAmount: 0, totalMinutes: 0, count: 0 };

    return NextResponse.json({
      billings,
      totalAmount: summary.totalAmount,
      totalMinutes: summary.totalMinutes,
      totalSessions: summary.count,
    });
  } catch (err) {
    console.error('Client billing error:', err);
    return NextResponse.json({ error: 'Failed to fetch billing' }, { status: 500 });
  }
}
