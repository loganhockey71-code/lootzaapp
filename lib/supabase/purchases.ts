import { supabase } from "@/lib/supabase";

export interface PurchaseRecord {
  id: string;
  productId: string;
  sellerId: string;
  price: number;
  status: string;
  createdAt: string;
}

interface PurchaseRow {
  id: string;
  product_id: string;
  seller_id: string;
  price: number;
  status: string;
  created_at: string;
}

function mapPurchaseRow(row: PurchaseRow): PurchaseRecord {
  return {
    id: row.id,
    productId: row.product_id,
    sellerId: row.seller_id,
    price: Number(row.price),
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function fetchMyPurchases(buyerId: string): Promise<PurchaseRecord[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as PurchaseRow[]).map(mapPurchaseRow);
}
