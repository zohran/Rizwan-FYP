import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { PaymentNotification } from '@/models';
import { getAuth } from '@/lib/get-auth';

/** Client reads their payment notifications */
export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const [notifications, unreadCount] = await Promise.all([
      PaymentNotification.find({ userId: auth.userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      PaymentNotification.countDocuments({ userId: auth.userId, isRead: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Client notifications error:', err);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/** Client marks a notification as read */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId, markAllRead } = body;

    await connectDB();

    if (markAllRead) {
      await PaymentNotification.updateMany({ userId: auth.userId }, { isRead: true });
    } else if (notificationId) {
      await PaymentNotification.updateOne({ _id: notificationId, userId: auth.userId }, { isRead: true });
    } else {
      return NextResponse.json({ error: 'notificationId or markAllRead required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
