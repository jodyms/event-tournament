import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAllowedApiOrigin } from '@/lib/api/cors';

const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = origin !== null && isAllowedApiOrigin(origin);
  const isPreflight = request.method === 'OPTIONS';

  if (isPreflight) {
    const headers = new Headers(corsOptions);
    headers.set('Vary', 'Origin');
    if (allowed && origin) headers.set('Access-Control-Allow-Origin', origin);
    const requested = request.headers.get('access-control-request-headers');
    if (requested) headers.set('Access-Control-Allow-Headers', requested);
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  if (allowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

export const config = {
  matcher: '/api/v1/:path*',
};
