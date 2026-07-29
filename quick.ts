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

  // Mask explicit dates so numbers in YYYY-MM-DD or DD/MM/YYYY are not misparsed as amounts
  const dateMaskPattern = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{1,2}[-/.]\d{1,2})\b/gi;
  const sForAmount = sClean.replace(dateMaskPattern, match => " ".repeat(match.length));

  // 1. Extract Amount
  const amountPattern = /\b(?:rp\.?\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(k|rb|jt|juta|m|miliar)?\b/i;
  const amountMatch = amountPattern.exec(sForAmount);
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
  let sForDate = sClean;
  if (amountMatch) {
    const start = amountMatch.index;
    const end = start + amountMatch[0].length;
    sForDate = sClean.substring(0, start) + " ".repeat(end - start) + sClean.substring(end);
  }

  const monthsList = [
    // English
    "january", "jan", "february", "feb", "march", "mar", "april", "apr", "may",
    "june", "jun", "july", "jul", "august", "aug", "september", "sep", "october", "oct",
    "november", "nov", "december", "dec",
    // Indonesian
    "januari", "februari", "peb", "maret", "mei", "juni", "juli",
    "agustus", "agt", "agus", "oktober", "okt", "nopember", "nop", "desember", "des"
  ];
  const monthsRegexStr = monthsList.join("|");
  
  const monthMap: { [key: string]: number } = {
    // English
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
    "august": 8, "aug": 8, "september": 9, "sep": 9, "october": 10, "oct": 10,
    "november": 11, "nov": 11, "december": 12, "dec": 12,
    // Indonesian
    "januari": 1, "februari": 2, "peb": 2, "maret": 3, "mei": 5, "juni": 6, "juli": 7,
    "agustus": 8, "agt": 8, "agus": 8, "oktober": 10, "okt": 10, "nopember": 11, "nop": 11, "desember": 12, "des": 12
  };

  const yesterdayPattern = /\b(yesterday|kemarin)\b/i;
  const todayPattern = /\b(today|hari\s+ini)\b/i;
  const numericYmdPattern = /\b(\d{4})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/i;
  const numericDmyPattern = /\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](\d{4})\b/i;
  const numericDmPattern = /\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])\b/i;
  const textualDmyPattern = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])\\s+(${monthsRegexStr})(?:,?\\s+(\\d{4}))?\\b`, "i");
  const textualMdyPattern = new RegExp(`\\b(${monthsRegexStr})\\s+(0?[1-9]|[12]\\d|3[01])(?:,?\\s+(\\d{4}))?\\b`, "i");

  let txDate = Utilities.formatDate(refDate, "Asia/Jakarta", "yyyy-MM-dd");
  let matchedDateStr: string | null = null;
  let parsedDate: Date | null = null;
  let match: RegExpExecArray | null = null;

  if ((match = yesterdayPattern.exec(sForDate))) {
    matchedDateStr = match[0];
    const prevDate = new Date(refDate);
    prevDate.setDate(refDate.getDate() - 1);
    txDate = Utilities.formatDate(prevDate, "Asia/Jakarta", "yyyy-MM-dd");
  } else if ((match = todayPattern.exec(sForDate))) {
    matchedDateStr = match[0];
    txDate = Utilities.formatDate(refDate, "Asia/Jakarta", "yyyy-MM-dd");
  } else if ((match = numericYmdPattern.exec(sForDate))) {
    matchedDateStr = match[0];
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const temp = new Date(y, m, d);
    if (temp.getFullYear() === y && temp.getMonth() === m && temp.getDate() === d) {
      parsedDate = temp;
    }
  } else if ((match = numericDmyPattern.exec(sForDate))) {
    matchedDateStr = match[0];
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const y = parseInt(match[3], 10);
    const temp = new Date(y, m, d);
    if (temp.getFullYear() === y && temp.getMonth() === m && temp.getDate() === d) {
      parsedDate = temp;
    }
  } else if ((match = textualDmyPattern.exec(sForDate))) {
    matchedDateStr = match[0];
    const d = parseInt(match[1], 10);
    const mName = match[2].toLowerCase();
    const m = (monthMap[mName] || 1) - 1;
    const y = match[3] ? parseInt(match[3], 10) : refDate.getFullYear();
    const temp = new Date(y, m, d);
    if (temp.getFullYear() === y && temp.getMonth() === m && temp.getDate() === d) {
      parsedDate = temp;
    }
  } else if ((match = textualMdyPattern.exec(sForDate))) {
    matchedDateStr = match[0];
    const mName = match[1].toLowerCase();
    const m = (monthMap[mName] || 1) - 1;
    const d = parseInt(match[2], 10);
    const y = match[3] ? parseInt(match[3], 10) : refDate.getFullYear();
    const temp = new Date(y, m, d);
    if (temp.getFullYear() === y && temp.getMonth() === m && temp.getDate() === d) {
      parsedDate = temp;
    }
  } else if ((match = numericDmPattern.exec(sForDate))) {
    matchedDateStr = match[0];
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const y = refDate.getFullYear();
    const temp = new Date(y, m, d);
    if (temp.getFullYear() === y && temp.getMonth() === m && temp.getDate() === d) {
      parsedDate = temp;
    }
  }

  if (parsedDate) {
    const yyyy = parsedDate.getFullYear();
    const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(parsedDate.getDate()).padStart(2, '0');
    txDate = `${yyyy}-${mm}-${dd}`;
  }

  // 4. Extract Description
  let descClean = sClean;
  descClean = descClean.replace(amountMatch[0], "");
  
  const typeMatch = debitPattern.exec(descClean) || creditPattern.exec(descClean);
  if (typeMatch) {
    descClean = descClean.replace(typeMatch[0], "");
  }
  if (matchedDateStr) {
    descClean = descClean.replace(matchedDateStr, "");
  }

  descClean = descClean.replace(/\s+/g, " ").trim();
  
  // Strip prepositions repeatedly
  while (true) {
    const prev = descClean;
    descClean = descClean.replace(/^(?:for|on|untuk|di|dari|at|bagi|pada|ke|about|buat|the|a|an|in)\s+/i, "");
    descClean = descClean.replace(/\s+(?:for|on|untuk|di|dari|at|bagi|pada|ke|about|buat|the|a|an|in)$/i, "");
    descClean = descClean.trim();
    if (descClean === prev) {
      break;
    }
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