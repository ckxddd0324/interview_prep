import { transformTransaction } from "../src/transformer";

describe("transformTransaction", () => {
  it("should transform a valid input correctly", () => {
    const input = {
      transaction_id: "tx-12345",
      amount: 150.0,
      currency: "USD",
      timestamp: "2024-01-15T10:30:00Z",
      merchant: {
        id: "m-789",
        name: "Example Corp",
      },
    };

    const result = transformTransaction(input);
    expect(result).toEqual({
      id: "tx-12345",
      amount: 150.0,
      merchantName: "Example Corp",
    });
  });

  it("should throw if merchant name is missing", () => {
    const badInput = {
      transaction_id: "tx-12345",
      amount: 150.0,
      currency: "USD",
      timestamp: "2024-01-15T10:30:00Z",
      merchant: {
        id: "m-789",
      },
    };

    expect(() => transformTransaction(badInput)).toThrow();
  });
});
