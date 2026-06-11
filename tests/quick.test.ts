export {};

// Import mock setup to ensure globals are defined
require('./setup.ts');

const quick = require('../quick.ts');
const parseTransactionSentence = quick.parseTransactionSentence;

describe("Quick Add Parser", () => {
  const refDate = new Date(2026, 5, 4, 12, 0, 0); // 2026-06-04 (Note: month index 5 is June)

  it("should parse basic debit sentence with k multiplier", () => {
    const result = parseTransactionSentence("spent 50k on lunch today", refDate);
    expect(result).toEqual({
      amount: 50000.0,
      type: "debit",
      date: "2026-06-04",
      description: "lunch"
    });
  });

  it("should parse credit sentence with jt multiplier", () => {
    const result = parseTransactionSentence("terima 1.5jt untuk gaji kemarin", refDate);
    expect(result).toEqual({
      amount: 1500000.0,
      type: "credit",
      date: "2026-06-03",
      description: "gaji"
    });
  });

  it("should parse raw numbers and handle thousands separators", () => {
    const result = parseTransactionSentence("bayar rp 50.000 untuk parkir", refDate);
    expect(result).toEqual({
      amount: 50000.0,
      type: "debit",
      date: "2026-06-04",
      description: "parkir"
    });
  });

  it("should parse m suffix for billions", () => {
    const result = parseTransactionSentence("beli saham 1m hari ini", refDate);
    expect(result).toEqual({
      amount: 1000000000.0,
      type: "debit",
      date: "2026-06-04",
      description: "saham"
    });
  });
});
