import { NextResponse } from 'next/server';
import { ConfigError } from '@/lib/server/supabase-admin';
import { RazorpayError } from '@/lib/server/razorpay';

export function errorResponse(e: unknown) {
  console.error('[payments]', e);
  if (e instanceof RazorpayError) {
    return NextResponse.json({ error: e.message }, { status: e.status >= 400 && e.status < 500 ? 400 : 502 });
  }
  if (e instanceof ConfigError) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
