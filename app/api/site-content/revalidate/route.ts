import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireFounder } from '@/lib/server/auth';
import { errorResponse } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Founder only. Called after saving text edits so the cached public pages refresh immediately.
export async function POST(req: Request) {
  try {
    const founder = await requireFounder(req);
    if (!founder) return NextResponse.json({ error: 'Founder access required.' }, { status: 403 });
    revalidateTag('site-content');
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}