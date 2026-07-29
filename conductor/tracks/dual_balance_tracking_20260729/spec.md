# Track Specification: Dual Balance Tracking (Monthly Reset & Cumulative Total)

## Overview
Currently, the Telegram bot tracks a single running balance across all transactions. This feature introduces two distinct balance concepts:
1. **Active Monthly Balance**: Tracks net income/expense for the current calendar month (resets to zero at the start of each month).
2. **Cumulative Total Balance**: Tracks aggregate net savings accumulated across all historical transactions from previous and current months.

## Functional Requirements
1. **Dual Balance Calculation & Storage (`database.ts`)**:
   - Provide helper methods `Database.getUserMonthlyBalance(userId, monthStr, accessToken)` and `Database.getUserCumulativeBalance(userId, accessToken)`.
   - Monthly Balance computes the sum of credits minus debits for transactions within the specified month `YYYY-MM`.
   - Cumulative Total Balance computes the sum of credits minus debits across all historical transaction records stored in Google Sheets for the user.

2. **Updated `/balance` Command Response (`handlers.ts`)**:
   - When a user runs `/balance`, the bot calculates both the Current Month Balance (for the active month, e.g., `2026-07`) and the Cumulative Total Balance.
   - Formats and displays both balances clearly:
     ```text
     📊 <b>Your Balance Overview</b>

     📅 <b>Current Month (2026-07):</b> <code>Rp 1.500.000,00</code>
     💰 <b>Cumulative Total:</b> <code>Rp 12.500.000,00</code>
     ```

3. **Transaction Confirmation Updates (`handlers.ts`, `quick.ts`)**:
   - When a user adds, edits, or clears transactions (`/add`, `/quick`, `/edit`, `/clear`), the confirmation message displays the updated **Current Month Balance**.

4. **Backward Compatibility**:
   - Existing transaction logging, sheet structures (`YYYY-MM Transactions`), and Google Sheets export remain intact while accurately reflecting both monthly and cumulative calculations.

## Acceptance Criteria
- [ ] `Database.getUserMonthlyBalance` correctly sums credits/debits for the active calendar month.
- [ ] `Database.getUserCumulativeBalance` correctly sums credits/debits across all user transaction sheets.
- [ ] `/balance` command outputs both Current Month Balance and Cumulative Total Balance in a formatted message.
- [ ] `/add`, `/quick`, `/edit`, and `/clear` confirmation messages display the updated Current Month Balance.
- [ ] All unit tests pass and test coverage remains >80%.
