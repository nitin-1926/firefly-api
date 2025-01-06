import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
	// If the request is for /dashboard, redirect to the home page
	if (request.nextUrl.pathname === '/dashboard') {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return NextResponse.next();
}
