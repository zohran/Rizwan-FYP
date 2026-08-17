import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Session, User } from '@/models';
import { getAuth } from '@/lib/get-auth';
import { createAlert, ALERT_TYPES } from '@/lib/create-alert';
import { networkViolationSchema } from '@/lib/validation';
import { getRestrictedRule, VIOLATION_DEDUP_MS } from '@/lib/network-rules';
import { apiError, apiValidationError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = networkViolationSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten(), 400);
    }

    const rule = getRestrictedRule(parsed.data.ruleId);
    if (!rule) {
      return NextResponse.json({ error: 'Unknown or non-restricted rule' }, { status: 400 });
    }

    await connectDB();

    const session = await Session.findOne({
      userId: auth.userId,
      status: 'active',
    });

    if (!session) {
      return NextResponse.json(
        { error: 'An active session is required to use the network' },
        { status: 400 }
      );
    }

    const now = new Date();
    const sameRuleRecently =
      session.lastViolationRule === rule.id &&
      session.lastViolationAt &&
      now.getTime() - session.lastViolationAt.getTime() < VIOLATION_DEDUP_MS;

    if (sameRuleRecently) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        flagged: true,
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.simulation.result,
      });
    }

    const user = await User.findById(auth.userId).select('username').lean();
    const username = user?.username ?? auth.userId;
    const severity = rule.severity ?? 'medium';

    await Session.updateOne(
      { _id: session._id },
      {
        $inc: { networkViolations: 1 },
        $set: {
          lastViolationAt: now,
          lastViolationRule: rule.id,
        },
      }
    );

    await createAlert({
      type: ALERT_TYPES.NETWORK_VIOLATION,
      userId: auth.userId,
      sessionId: session._id,
      severity,
      ruleId: rule.id,
      message: `Client "${username}" broke network policy: ${rule.title} (${severity}). Machine ${session.machineId}. ${rule.policy}`,
    });

    return NextResponse.json({
      success: true,
      duplicate: false,
      flagged: true,
      ruleId: rule.id,
      severity,
      message: rule.simulation.result,
    });
  } catch (err) {
    console.error('Network violation error:', err);
    return apiError('Failed to record network event', 500);
  }
}
