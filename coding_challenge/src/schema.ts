// ajv schema object
export const transactionSchema = {
  type: "object",
  required: ["transaction_id", "amount", "currency", "timestamp", "merchant"],
  properties: {
    transaction_id: { type: "string" },
    amount: { type: "number" },
    currency: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    merchant: {
      type: "object",
      required: ["id", "name"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    },
  },
};
