import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathLower = url.pathname.toLowerCase();

  // Redirect legacy Projects route to Activities to avoid loading old page code
  if (pathLower === '/participant/projects') {
    url.pathname = '/participant/activities';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/participant/:path*'],
};
