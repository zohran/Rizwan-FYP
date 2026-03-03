import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Alert } from '@/models';
import { requireAdmin } from '@/lib/get-auth';
import { markAlertReadSchema } from '@/lib/validation';
import { apiError, apiValidationError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const skip = (page - 1) * limit;

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (unreadOnly) filter.isRead = false;

    const [alerts, total, unreadCount] = await Promise.all([
      Alert.find(filter)
        .populate('userId', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(filter),
      Alert.countDocuments({ isRead: false }),
    ]);

    return NextResponse.json({
      alerts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    });
  } catch (err) {
    console.error('Alerts error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    const body = await request.json().catch(() => ({}));
    const parsed = markAlertReadSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten(), 400);
    }

    await connectDB();

    if (parsed.data.markAllRead) {
      await Alert.updateMany({}, { isRead: true });
      return NextResponse.json({ success: true });
    }

    if (parsed.data.alertId) {
      await Alert.updateOne({ _id: parsed.data.alertId }, { isRead: true });
      return NextResponse.json({ success: true });
    }

    return apiError('alertId or markAllRead required', 400);
  } catch (err) {
    console.error('Mark alert read error:', err);
    return apiError('Failed to update alert', 500);
  }
}
