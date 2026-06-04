# Specification - Currency Customization to Rupiah (Rp)

## Overview
This track modifies the chatbot's transaction and balance output to display currency in Indonesian Rupiah (Rp) formatted with thousands separator as '.' and decimals as ',' (e.g., `Rp 150.000,00`).

## Functional Requirements
1. **Currency Sign Replacement**: Replace the dollar symbol (`$`) with the Rupiah prefix (`Rp `).
2. **Indonesian Number Formatting**:
   - The amount must be formatted as Indonesian Rupiah with decimal places: `Rp X.XXX,XX`.
   - Thousands separator must be a period (`.`).
   - Decimal separator must be a comma (`,`).
3. **Target Interfaces**:
   - Transaction logging confirmation (`/add`).
   - Current net balance command (`/balance`).
   - Transaction history list (`/view`).
   - Weekly & monthly financial summary lists (`/summary`).

## Non-Functional Requirements
- Maintain standard database operations (amounts remain floats).
- Maintain raw numeric floats in Google Sheets exports, allowing Google Sheets to format them natively.
- Keep tests updated to expect `Rp` and Indonesian formatting.

## Acceptance Criteria
- `/balance` returns a message like: `📈 Current Net Balance: <b>Rp 150.000,00</b>`
- `/add` confirmation displays the logged amount and current balance formatted in Rupiah (e.g. `Rp 150.000,00`).
- `/view` history shows transaction list formatted with `Rp`.
- `/summary` reports totals formatted with `Rp`.
- All tests pass.
