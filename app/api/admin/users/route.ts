import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models';
import { requireAdmin } from '@/lib/get-auth';

/** List client users for filter dropdowns */
export async function GET() {
  try {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    await connectDB();

    const users = await User.find({ role: 'client' })
      .select('_id username')
      .sort({ username: 1 })
      .lean();

    return NextResponse.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
