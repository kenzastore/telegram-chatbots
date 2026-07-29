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

  it("should parse relative date kemarin/yesterday", () => {
    const result = parseTransactionSentence("spent 50k on lunch kemarin", refDate);
    expect(result).toEqual({
      amount: 50000.0,
      type: "debit",
      date: "2026-06-03",
      description: "lunch"
    });
  });

  it("should parse numeric YYYY-MM-DD formats", () => {
    const result1 = parseTransactionSentence("spent 100000 on shopping 2026-06-08", refDate);
    expect(result1?.date).toBe("2026-06-08");
    expect(result1?.description).toBe("shopping");

    const result2 = parseTransactionSentence("spent 100000 on shopping 2026/06/08", refDate);
    expect(result2?.date).toBe("2026-06-08");

    const result3 = parseTransactionSentence("spent 100000 on shopping 2026.06.08", refDate);
    expect(result3?.date).toBe("2026-06-08");
  });

  it("should parse numeric DD-MM-YYYY formats", () => {
    const result1 = parseTransactionSentence("terima rp 5000000 gaji 08-06-2026", refDate);
    expect(result1?.date).toBe("2026-06-08");
    expect(result1?.description).toBe("gaji");

    const result2 = parseTransactionSentence("terima rp 5000000 gaji 08/06/2026", refDate);
    expect(result2?.date).toBe("2026-06-08");

    const result3 = parseTransactionSentence("terima rp 5000000 gaji 08.06.2026", refDate);
    expect(result3?.date).toBe("2026-06-08");
  });

  it("should parse numeric DD-MM format assuming current year", () => {
    const result = parseTransactionSentence("spent 25k for dinner 08-06", refDate);
    expect(result).toEqual({
      amount: 25000.0,
      type: "debit",
      date: "2026-06-08",
      description: "dinner"
    });
  });

  it("should parse textual DD Month YYYY formats in English and Indonesian", () => {
    const resultEn = parseTransactionSentence("bayar 15000 untuk internet 8 June 2026", refDate);
    expect(resultEn?.date).toBe("2026-06-08");
    expect(resultEn?.description).toBe("internet");

    const resultId = parseTransactionSentence("receive 1.5jt terima 08 Juni 2026", refDate);
    expect(resultId?.date).toBe("2026-06-08");
    expect(resultId?.description).toBe("terima");
  });

  it("should parse textual DD Month format assuming current year", () => {
    const result = parseTransactionSentence("spent 50k on lunch 8 Jun", refDate);
    expect(result).toEqual({
      amount: 50000.0,
      type: "debit",
      date: "2026-06-08",
      description: "lunch"
    });
  });

  it("should parse textual Month DD YYYY formats", () => {
    const result = parseTransactionSentence("beli buku rp 120.000 June 8, 2026", refDate);
    expect(result).toEqual({
      amount: 120000.0,
      type: "debit",
      date: "2026-06-08",
      description: "buku"
    });
  });

  it("should parse textual Month DD format assuming current year", () => {
    const result = parseTransactionSentence("spent 50k coffee Juni 08", refDate);
    expect(result).toEqual({
      amount: 50000.0,
      type: "debit",
      date: "2026-06-08",
      description: "coffee"
    });
  });

  it("should repeatedly strip leading/trailing prepositions", () => {
    const result = parseTransactionSentence("spent 50000 for a lunch", refDate);
    expect(result?.description).toBe("lunch");
  });

  it("should parse date correctly when placed at the beginning of the sentence", () => {
    const result = parseTransactionSentence("kemarin terima rp 100k gaji bulanan", refDate);
    expect(result).toEqual({
      amount: 100000.0,
      type: "credit",
      date: "2026-06-03",
      description: "gaji bulanan"
    });
  });

  it("should parse YYYY-MM-DD date correctly when placed at the beginning of the sentence", () => {
    const result = parseTransactionSentence("2026-06-08 spent 50k on shopping", refDate);
    expect(result).toEqual({
      amount: 50000.0,
      type: "debit",
      date: "2026-06-08",
      description: "shopping"
    });
  });

  it("should parse date correctly when placed in the middle of the sentence", () => {
    const result = parseTransactionSentence("spent 50k 2026-06-08 on shopping", refDate);
    expect(result).toEqual({
      amount: 50000.0,
      type: "debit",
      date: "2026-06-08",
      description: "shopping"
    });
  });
});

