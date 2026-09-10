import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Short-lived on purpose — this is a download link, not a persistent asset URL.
const SIGNED_URL_EXPIRES_IN_SECONDS = 60;

/**
 * GET /api/download?productId=<uuid>
 * Authorization: Bearer <supabase access token>
 *
 * Verifies the caller (via their own access token, checked server-side against
 * Supabase Auth) owns the product — either as the buyer of a completed purchase
 * or as the product's seller — then mints a short-lived signed URL into the
 * private product-files bucket. Nothing here is ever a public URL, and no file
 * bytes pass through this server; Supabase serves the signed URL directly.
 */
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "Missing productId." }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return NextResponse.json({ error: "You must be logged in to download this." }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }
  const userId = userData.user.id;

  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, seller_id, product_file_path")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ error: "Failed to look up this product." }, { status: 500 });
  }
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  if (!product.product_file_path) {
    return NextResponse.json({ error: "This product doesn't have a downloadable file." }, { status: 404 });
  }

  const isSeller = product.seller_id === userId;

  let isOwner = isSeller;
  if (!isOwner) {
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("purchases")
      .select("id")
      .eq("buyer_id", userId)
      .eq("product_id", productId)
      .eq("status", "completed")
      .maybeSingle();
    if (purchaseError) {
      return NextResponse.json({ error: "Failed to verify ownership." }, { status: 500 });
    }
    isOwner = !!purchase;
  }

  if (!isOwner) {
    return NextResponse.json({ error: "You don't own this product." }, { status: 403 });
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from("product-files")
    .createSignedUrl(product.product_file_path, SIGNED_URL_EXPIRES_IN_SECONDS);

  if (signError || !signed) {
    return NextResponse.json({ error: "Failed to create a download link." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS });
}
