# Implementation Plan - Dual Balance Tracking (Monthly Reset & Cumulative Total)

## Phase 1: Test-Driven Development & Unit Tests

- [ ] Task: Write failing unit tests for dual balance calculation and command formatting
    - [ ] Add unit tests in `tests/database.test.ts` for `Database.getUserMonthlyBalance` and `Database.getUserCumulativeBalance`.
    - [ ] Add unit tests in `tests/handlers.test.ts` verifying `/balance` outputs both Current Month Balance and Cumulative Total Balance.
    - [ ] Confirm tests fail (Red Phase).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Test-Driven Development & Unit Tests' (Protocol in workflow.md)

## Phase 2: Implementation & Verification

- [ ] Task: Implement dual balance methods in `database.ts`
    - [ ] Add `getUserMonthlyBalance(userId, monthStr, accessToken)` to calculate net balance for a specific calendar month.
    - [ ] Add `getUserCumulativeBalance(userId, accessToken)` to calculate aggregate net balance across all historical sheets.
- [ ] Task: Update `/balance` command and transaction confirmation messages in `handlers.ts`
    - [ ] Update `handleBalanceCommand` to format and display both Current Month Balance and Cumulative Total Balance.
    - [ ] Update transaction confirmation responses (`/add`, `/quick`, `/edit`, `/clear`) to display the active Current Month Balance.
- [ ] Task: Verify unit tests pass and code coverage >80% (Green Phase)
    - [ ] Run full test suite `CI=true npm test`.
    - [ ] Verify test coverage remains >80%.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation & Verification' (Protocol in workflow.md)
