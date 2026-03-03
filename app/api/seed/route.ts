import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, BillingRate } from '@/models';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const hashed = await hashPassword('admin123');
      await User.create({
        username: 'admin',
        password: hashed,
        role: 'admin',
      });
    }

    const existingClient = await User.findOne({ username: 'client' });
    if (!existingClient) {
      const hashed = await hashPassword('client123');
      await User.create({
        username: 'client',
        password: hashed,
        role: 'client',
      });
    }

    const existingRate = await BillingRate.findOne();
    if (!existingRate) {
      await BillingRate.create({ ratePerMinute: 1 });
    }

    return NextResponse.json({
      success: true,
      message: 'Seeded admin (admin/admin123), client (client/client123), and default rate.',
    });
  } catch (err) {
    console.error('Seed error:', err);
    return NextResponse.json(
      { error: 'Seed failed' },
      { status: 500 }
    );
  }
}
