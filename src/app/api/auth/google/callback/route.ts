import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/google/callback
 * Exchanges the authorization code for an access token,
 * stores it in a short-lived cookie, and redirects to the importing page.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || "http://localhost:3000";

  // User denied access or something went wrong
  if (error || !code) {
    return NextResponse.redirect(
      new URL("/contacts?import=cancelled", req.url)
    );
  }

  // Verify state to prevent CSRF
  if (state !== "clara-google-import") {
    return NextResponse.redirect(
      new URL("/contacts?import=error&reason=invalid_state", req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/contacts?import=error&reason=not_configured", req.url)
    );
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(
        new URL("/contacts?import=error&reason=token_failed", req.url)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Store token in a short-lived httpOnly cookie and redirect to loading page
    const response = NextResponse.redirect(
      new URL("/contacts/importing", req.url)
    );

    response.cookies.set("google_import_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 300, // 5 minutes — just enough to complete the import
    });

    return response;
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(
      new URL("/contacts?import=error&reason=unknown", req.url)
    );
  }
}
