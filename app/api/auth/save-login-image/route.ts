import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/get-auth';
import { saveLoginImageSchema } from '@/lib/validation';
import { apiError, apiValidationError } from '@/lib/api-response';

/**
 * Validates base64 image data and returns it for storage in sessionStorage.
 * The image is stored in the Session document when /api/sessions/start is called.
 * No file system storage - image is persisted as base64 in the database.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = saveLoginImageSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten(), 400);
    }

    const imageBase64 = (body.imageBase64 ?? body.image ?? '').toString();

    return NextResponse.json({
      success: true,
      imageBase64,
    });
  } catch (err) {
    console.error('Save login image error:', err);
    return apiError('Failed to validate image', 500);
  }
}
