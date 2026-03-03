import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Billing, BillingRate, User } from '@/models';
import { requireAdmin } from '@/lib/get-auth';
import { DEFAULT_RATE_PER_MINUTE } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search')?.trim();

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.createdAt = filter.createdAt ?? {};
      if (startDate) (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) (filter.createdAt as Record<string, Date>).$lte = new Date(endDate);
    }
    if (search && !userId) {
      const matchingUsers = await User.find({
        role: 'client',
        username: { $regex: search, $options: 'i' },
      })
        .select('_id')
        .lean();
      const userIds = matchingUsers.map((u) => u._id);
      if (userIds.length === 0) {
        return NextResponse.json({
          ratePerMinute: (await BillingRate.findOne().sort({ updatedAt: -1 }))?.ratePerMinute ?? DEFAULT_RATE_PER_MINUTE,
          totalEarnings: 0,
          totalMinutes: 0,
          totalRecords: 0,
          startDate: startDate ?? null,
          endDate: endDate ?? null,
        });
      }
      filter.userId = { $in: userIds };
    }

    const [rateDoc, aggregation] = await Promise.all([
      BillingRate.findOne().sort({ updatedAt: -1 }).lean(),
      Billing.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            totalMinutes: { $sum: '$totalMinutes' },
            recordCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = aggregation[0] ?? {
      totalAmount: 0,
      totalMinutes: 0,
      recordCount: 0,
    };

    return NextResponse.json({
      ratePerMinute: rateDoc?.ratePerMinute ?? DEFAULT_RATE_PER_MINUTE,
      totalEarnings: summary.totalAmount,
      totalMinutes: summary.totalMinutes,
      totalRecords: summary.recordCount,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    });
  } catch (err) {
    console.error('Billing summary error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
