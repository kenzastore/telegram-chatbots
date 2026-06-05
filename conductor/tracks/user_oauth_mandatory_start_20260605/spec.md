# Specification - Mandatory Google OAuth & Multi-User Transaction Separation

## 1. Overview
This track introduces mandatory Google OAuth2 authentication upon start and multi-user data isolation. Every user accessing the bot must log in to Google first. Their session and transactions are isolated from other users using their Telegram user ID.

## 2. Functional Requirements
### 2.1 Mandatory Google Login Gate
- When a user sends `/start` or any standard bot command (e.g. `/add`, `/quick`, `/balance`, `/view`, `/summary`, `/edit`, `/clear`), the bot checks if they have valid Google credentials saved in the database.
- If credentials are NOT found, the bot blocks the command, informs the user they must authenticate first, and displays the Google OAuth2 link with instructions.
- Only `/start`, `/help`, and `/cancel` are accessible before logging in.
- Once authenticated, the user receives access to all bot features.

### 2.2 Multi-Tenant Data Isolation (Separate User Sessions)
- **Database Schema Migration**:
  - Update the `transactions` table to add a `user_id` INTEGER column.
  - Existing transactions are migrated by assigning them to a fallback user ID (or the first user ID who logs in).
- **Data Filtering**:
  - All database queries and operations (insert, select, update, delete, clear, balance recalculation) must filter by the current Telegram user ID.
  - A new user starting the bot for the first time will have an empty transaction history (zero transactions).

### 2.3 Logout Behavior
- When a user runs `/google_logout`, their Google credentials and spreadsheet config are removed from the database, but their local transactions remain saved (associated with their user ID).
- Upon logout, they are immediately blocked from further transaction commands until they log back in.

## 3. Non-Functional Requirements
- Maintain code coverage above 80% (ideally >90%).
- Ensure all API database calls and bot commands handle user isolation securely.

## 4. Acceptance Criteria
- [ ] Directing `/add`, `/quick`, etc. as an unauthenticated user blocks the command and prompts for Google Login.
- [ ] Multi-tenant isolation is enforced: User A cannot see or edit User B's transactions.
- [ ] A new user gets a clean list of transactions on first login.
- [ ] Revoking credentials or logging out blocks the user until they log in again.
