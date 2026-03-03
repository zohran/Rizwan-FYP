import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getAuth } from '@/lib/get-auth';
import { saveLoginImageSchema } from '@/lib/validation';
import { apiError, apiValidationError } from '@/lib/api-response';

/** Accepts base64 data URL (e.g. data:image/jpeg;base64,...) and saves to public/logins/timestamp.png */
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

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const filename = `${timestamp}.png`;
    const logsDir = path.join(process.cwd(), 'public', 'logins');

    await mkdir(logsDir, { recursive: true });

    const filePath = path.join(logsDir, filename);
    await writeFile(filePath, buffer);

    const imagePath = `/logins/${filename}`;

    return NextResponse.json({
      success: true,
      imagePath,
    });
  } catch (err) {
    console.error('Save login image error:', err);
    return apiError('Failed to save image', 500);
  }
}
