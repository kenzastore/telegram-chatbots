# Specification - Currency Customization to Rupiah (Rp) - GAS Refactor

## Overview
This track refactors/adapts the Rupiah currency formatting and parsing logic from the Python codebase to Google Apps Script. It ensures full behavioral parity for Indonesian Rupiah formatting and input parsing across all chatbot commands and outputs, matching the specifications of the original python track `change_currency_rupiah_20260604`.

## Functional Requirements
1. **Rupiah Formatting Helper**:
   - Formats numeric amounts as Indonesian Rupiah: `Rp X.XXX,XX`.
   - Thousands separator must be a period (`.`).
   - Decimal separator must be a comma (`,`).
   - Supports formatting for positive, negative, zero, and fractional values (e.g., `Rp 1.250,50`, `Rp 0,00`, `Rp -500,25`).
2. **Command Outputs Integration**:
   - Ensure transaction logging confirmation `/add` uses Rupiah formatting.
   - Ensure current net balance `/balance` uses Rupiah formatting.
   - Ensure transaction history `/view` lists transactions in Rupiah.
   - Ensure weekly & monthly financial summaries `/summary` output totals in Rupiah.
3. **Natural Language / Quick Add Parsing (`/quick`)**:
   - Ensure multiplier parsing logic (`rp`, `k`, `rb`, `jt`, `juta`, `m`, `miliar`) in `quick.ts` is fully compatible with Python's parsed behavior.
4. **Google Sheets Database**:
   - Maintain raw numeric floats in the Google Sheets database to allow Sheets to handle math/formatting naturally.

## Non-Functional Requirements
- **TypeScript Type Safety**: All refactored code must enforce TypeScript type definitions.
- **TDD / Testing Coverage**: Follow the Test-Driven Development (TDD) cycle. Keep unit test coverage at >80% for modified files.

## Acceptance Criteria
- `formatCurrency` helper behaves identically to Python's `format_rupiah` for:
  - `150000.0` -> `Rp 150.000,00`
  - `1250.5` -> `Rp 1.250,50`
  - `0.0` -> `Rp 0,00`
  - `-500.25` -> `Rp -500,25`
- `/quick` parses amounts correctly:
  - `rp 50.000` -> `50000`
  - `1.5jt` -> `1500000`
  - `50k` -> `50000`
- All unit tests in Jest pass successfully.
