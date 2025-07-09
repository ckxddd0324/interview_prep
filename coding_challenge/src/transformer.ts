export interface TransformedTransaction {
  id: string;
  amount: number;
  merchantName: string;
}

// transform for generate the proper object ot ingest
export function transformTransaction(data: any): TransformedTransaction {
  if (
    !data.transaction_id ||
    typeof data.amount !== "number" ||
    !data.merchant?.name
  ) {
    throw new Error("Invalid transaction data");
  }

  return {
    id: data.transaction_id,
    amount: data.amount,
    merchantName: data.merchant.name,
  };
}
