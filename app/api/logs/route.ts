import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Log, User } from '@/models';
import { requireAdmin } from '@/lib/get-auth';

export async function GET(request: NextRequest) {
  try {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const search = searchParams.get('search')?.trim();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const skip = (page - 1) * limit;

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.loginTime = filter.loginTime ?? {};
      if (startDate) (filter.loginTime as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) (filter.loginTime as Record<string, Date>).$lte = new Date(endDate);
    }

    // Search by username (only when userId not set)
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
          logs: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
      filter.userId = { $in: userIds };
    }

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .populate('userId', 'username')
        .sort({ loginTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Log.countDocuments(filter),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Logs error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
