import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Billing, PaymentNotification, User } from '@/models';
import { requireAdmin } from '@/lib/get-auth';
import { emitToUser, SOCKET_EVENTS } from '@/lib/socket';

/**
 * Admin sends payment notification to a client.
 * Body: { userId, billingId? }
 * - billingId provided → notification for that specific session
 * - billingId omitted → notification for all unpaid sessions (total)
 */
export async function POST(request: NextRequest) {
  try {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    const body = await request.json().catch(() => ({}));
    const { userId, billingId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId).select('username').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let amount: number;
    let message: string;
    let type: 'session' | 'all';

    if (billingId) {
      const billing = await Billing.findOne({ _id: billingId, userId }).lean();
      if (!billing) {
        return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
      }
      amount = billing.totalAmount;
      message = `Payment of $${amount.toFixed(2)} is due for session on ${new Date(billing.createdAt).toLocaleDateString()} (${billing.totalMinutes} min).`;
      type = 'session';
    } else {
      const agg = await Billing.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]);
      amount = agg[0]?.total ?? 0;
      const count = agg[0]?.count ?? 0;
      message = `Total payment of $${amount.toFixed(2)} is due for ${count} session(s). Please settle your balance.`;
      type = 'all';
    }

    const notification = await PaymentNotification.create({
      userId,
      billingId: billingId ?? undefined,
      amount,
      message,
      type,
    });

    emitToUser(userId, SOCKET_EVENTS.PAYMENT_NOTIFICATION, {
      id: notification._id,
      amount,
      message,
      type,
      createdAt: notification.createdAt,
    });

    return NextResponse.json({ success: true, notification: { id: notification._id, amount, message, type } });
  } catch (err) {
    console.error('Send payment notification error:', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
