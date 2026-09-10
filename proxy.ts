import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js reserves any URL segment starting with "@" for parallel-route slots,
 * so /@handle 404s even though app/[handle] happily renders /handle. Rewriting
 * here (before the router resolves the page tree) keeps the /@handle URL in
 * the browser's address bar while internally serving the same [handle] route.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/@([^/]+)\/?$/);
  if (match) {
    const url = request.nextUrl.clone();
    url.pathname = `/${match[1]}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

// A literal "@" isn't matchable via the matcher's path-to-regexp syntax (it's
// a reserved token there), so match broadly and filter by regex in the
// function body instead. This excludes static assets to keep overhead low.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
