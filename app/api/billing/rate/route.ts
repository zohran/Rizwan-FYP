import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { BillingRate } from '@/models';
import { getAuth, requireAdmin } from '@/lib/get-auth';
import { updateRateSchema } from '@/lib/validation';
import { DEFAULT_RATE_PER_MINUTE } from '@/lib/constants';

export async function GET() {
  try {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    await connectDB();

    const rateDoc = await BillingRate.findOne().sort({ updatedAt: -1 });
    const ratePerMinute = rateDoc?.ratePerMinute ?? DEFAULT_RATE_PER_MINUTE;

    return NextResponse.json({ ratePerMinute });
  } catch (err) {
    console.error('Get rate error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    const auth = await getAuth();
    if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = updateRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectDB();

    await BillingRate.create({
      ratePerMinute: parsed.data.ratePerMinute,
      updatedBy: auth.userId,
    });

    return NextResponse.json({
      success: true,
      ratePerMinute: parsed.data.ratePerMinute,
    });
  } catch (err) {
    console.error('Update rate error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
