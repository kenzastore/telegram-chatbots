interface ParsedTx {
  amount: number;
  type: 'debit' | 'credit';
  date: string;
  description: string;
}

function parseTransactionSentence(sentence: string, refDate: Date = new Date()): ParsedTx | null {
  if (!sentence) return null;
  let sClean = sentence.trim();
  if (sClean.startsWith("/quick")) {
    sClean = sClean.substring(6).trim();
  }

  // 1. Extract Amount
  const amountPattern = /\b(?:rp\.?\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(k|rb|jt|juta|m|miliar)?\b/i;
  const amountMatch = amountPattern.exec(sClean);
  if (!amountMatch) return null;

  const amountRaw = amountMatch[1].replace(/\s+/g, "");
  const suffix = amountMatch[2]?.toLowerCase();
  let amountVal = 0;

  if (suffix) {
    const s = amountRaw.replace(/,/g, ".");
    const val = parseFloat(s);
    if (suffix === "k" || suffix === "rb") amountVal = val * 1000;
    else if (suffix === "jt" || suffix === "juta") amountVal = val * 1000000;
    else if (suffix === "m" || suffix === "miliar") amountVal = val * 1000000000;
    else amountVal = val;
  } else {
    if (amountRaw.length >= 4 && (amountRaw[amountRaw.length - 4] === "." || amountRaw[amountRaw.length - 4] === ",") && /^\d+$/.test(amountRaw.slice(-3))) {
      const s = amountRaw.slice(0, -4) + amountRaw.slice(-3);
      amountVal = parseFloat(s);
    } else {
      const s = amountRaw.replace(/,/g, ".");
      amountVal = parseFloat(s);
    }
  }

  // 2. Extract Type
  const debitPattern = /\b(spent|pay|bayar|beli|debit|keluar|makan|shopping)\b/i;
  const creditPattern = /\b(receive|income|terima|dapat|gaji|credit|masuk)\b/i;

  const hasDebit = debitPattern.test(sClean);
  const hasCredit = creditPattern.test(sClean);

  if (hasDebit && hasCredit) return null;
  let txType: 'debit' | 'credit';
  if (hasDebit) txType = 'debit';
  else if (hasCredit) txType = 'credit';
  else return null;

  // 3. Extract Date (assumes GMT+7/Asia/Jakarta timezone)
  let txDate = Utilities.formatDate(refDate, "Asia/Jakarta", "yyyy-MM-dd");
  let matchedDateStr: string | null = null;

  const yesterdayPattern = /\b(yesterday|kemarin)\b/i;
  const todayPattern = /\b(today|hari\s+ini)\b/i;

  if (yesterdayPattern.test(sClean)) {
    matchedDateStr = yesterdayPattern.exec(sClean)![0];
    const prevDate = new Date(refDate);
    prevDate.setDate(refDate.getDate() - 1);
    txDate = Utilities.formatDate(prevDate, "Asia/Jakarta", "yyyy-MM-dd");
  } else if (todayPattern.test(sClean)) {
    matchedDateStr = todayPattern.exec(sClean)![0];
  }

  // 4. Extract Description
  let descClean = sClean;
  descClean = descClean.replace(amountMatch[0], "");
  
  const typeMatch = debitPattern.exec(descClean) || creditPattern.exec(descClean);
  if (typeMatch) descClean = descClean.replace(typeMatch[0], "");
  if (matchedDateStr) descClean = descClean.replace(matchedDateStr, "");

  descClean = descClean.replace(/\s+/g, " ").trim();
  const prepPattern = /^(?:for|on|untuk|di|dari|at|bagi|pada|ke|about|buat|the|a|an|in)\s+/i;
  while (prepPattern.test(descClean)) {
    descClean = descClean.replace(prepPattern, "").trim();
  }

  if (!descClean) return null;

  return {
    amount: amountVal,
    type: txType,
    date: txDate,
    description: descClean
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseTransactionSentence
  };
}