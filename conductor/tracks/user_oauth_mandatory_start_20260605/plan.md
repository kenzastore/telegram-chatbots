# Implementation Plan - Google OAuth Mandatory Login and Multi-User Separation

## Phase 1: Database Multi-User Schema Migration [checkpoint: 50fcf4c]
- [x] Task: Add `user_id` column to `transactions` table and migrate existing records [10dcae2]
    - [x] Write unit tests verifying schema migration and fallback user ID mapping in database setup.
    - [x] Update `init_db` in `db.py` to add `user_id` to `transactions` table (gracefully using `ALTER TABLE ... ADD COLUMN` if already exists).
- [x] Task: Refactor database functions for `user_id` scoping [1a915c4]
    - [x] Update tests in `tests/test_db.py` to pass `user_id` in database operations and check multi-user isolation (assert User A cannot see User B's data).
    - [x] Update all transaction DB helpers in `db.py` to accept `user_id` and filter/write queries using `user_id` scoping (e.g. `get_balance`, `add_transaction`, `get_all_transactions`, `get_summaries`, `clear_transactions`).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database Multi-User Schema Migration' (Protocol in workflow.md) [50fcf4c]

## Phase 2: Mandatory Google Login Gate & Bot Scoping
- [ ] Task: Implement Authentication Middleware/Gate in Telegram Bot
    - [ ] Write tests in `tests/test_bot.py` verifying that commands sent by an unauthenticated user (other than `/start`, `/help`, `/google_login`, `/cancel`) are intercepted and blocked with a login prompt.
    - [ ] Implement an authentication check gate in `bot.py` to block commands and prompt for Google login if the user has no Google credentials in the database.
- [ ] Task: Update Bot Command Handlers to Pass `user_id` to DB
    - [ ] Update tests in `tests/test_bot.py` to verify commands operate on the current user's isolated data.
    - [ ] Update bot handlers (like `/add`, `/quick`, `/balance`, `/view`, `/summary`, `/edit`, `/clear`) to retrieve the user's Telegram ID and pass it to the scoped database helper functions.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Mandatory Google Login Gate & Bot Scoping' (Protocol in workflow.md)
