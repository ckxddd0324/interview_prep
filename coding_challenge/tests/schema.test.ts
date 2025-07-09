import Ajv from "ajv";
import addFormats from "ajv-formats";
import { transactionSchema } from "../src/schema";

describe("transactionSchema validation", () => {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(transactionSchema);

  it("should pass for valid transaction", () => {
    const validData = {
      transaction_id: "tx-12345",
      amount: 150.0,
      currency: "USD",
      timestamp: "2024-01-15T10:30:00Z",
      merchant: {
        id: "m-789",
        name: "Example Corp",
      },
    };

    expect(validate(validData)).toBe(true);
  });

  it("should fail if required fields are missing", () => {
    const invalidData = {
      transaction_id: "tx-12345",
      amount: 150.0,
      currency: "USD",
      merchant: { id: "m-789" }, // missing name and timestamp
    };

    expect(validate(invalidData)).toBe(false);
    expect(validate.errors).toBeDefined();
    expect(validate.errors!.length).toBeGreaterThan(0);
  });
});
