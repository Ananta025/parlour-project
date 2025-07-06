import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if the path is dashboard-related
  const isDashboardPath = path.startsWith('/dashboard');
  
  // Skip middleware if not accessing dashboard
  if (!isDashboardPath) {
    return NextResponse.next();
  }

  // Check for token in cookies first
  const token = request.cookies.get('token')?.value;
  
  if (!token) {
    // If no token in cookies, redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

// Only run middleware on dashboard routes
export const config = {
  matcher: ['/dashboard/:path*'],
};
