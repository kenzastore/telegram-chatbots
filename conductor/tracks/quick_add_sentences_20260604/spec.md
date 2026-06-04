# Specification - Quick Add Transaction via Typed Sentences

## Overview
Introduce a new command `/quick <sentence>` that parses natural language inputs (in both Indonesian and English) into structured financial transactions (date, amount, type, description) and prompts the user for confirmation before saving them to the database.

## Functional Requirements
1. **Command Activation**:
   - The user runs `/quick <sentence>` (e.g., `/quick spent 50000 on lunch yesterday`).
   - If `/quick` is run without any arguments, the bot should reply with an error message and usage instructions.

2. **Sentence Parsing Engine**:
   - Parse the sentence text using pattern matching (regex-based).
   - **Type Extraction**:
     - Debit (Expense) indicators: `spent`, `pay`, `bayar`, `beli`, `debit`, `keluar`, `makan`, `shopping`.
     - Credit (Income) indicators: `receive`, `income`, `terima`, `dapat`, `gaji`, `credit`, `masuk`.
   - **Amount Extraction**:
     - Extract digits, optionally supporting comma/dot separators.
     - Support suffixes:
       - `k` or `rb` (thousand, multiplier: 1,000)
       - `jt` or `juta` (million, multiplier: 1,000,000)
       - `m` or `miliar` (billion, multiplier: 1,000,000,000)
       - E.g., `50k` -> 50,000; `1.5jt` -> 1,500,000.
   - **Date Extraction**:
     - If the sentence contains `yesterday` or `kemarin`, set the date to yesterday.
     - If the sentence contains `today` or `hari ini`, set the date to today.
     - E.g., if a date pattern `YYYY-MM-DD` is matched, use it.
     - Otherwise, default to the current date (Today).
   - **Description Extraction**:
     - The remainder of the sentence after removing matched command, amount, type keywords, and date keywords.
     - Clean up extra spaces, prepositions (e.g., `for`, `on`, `untuk`, `di`), and return a clean description. E.g., `/quick spent 50000 on lunch yesterday` -> Description: `lunch`.

3. **Confirmation Interaction**:
   - Present the parsed results to the user in a message with two inline confirmation buttons:
     - `Confirm Save ✅`
     - `Cancel ❌`
   - Temporary state is stored in `context.user_data` (e.g. `quick_tx` dict).
   - If the user clicks `Confirm Save ✅`:
     - Save the transaction to the SQLite database.
     - Automatically recalculate balances.
     - Confirm saving to the user with the new net balance, and restore the main commands keyboard.
   - If the user clicks `Cancel ❌` (or runs `/cancel`):
     - Abort, clear state, notify user, and restore the main commands keyboard.

## Non-Functional Requirements
- Local deterministic parsing: No external API or LLM dependency is required.
- High reliability: The parsing logic must be covered by comprehensive unit tests.

## Acceptance Criteria
- `/quick` without parameters returns guidance on syntax.
- `/quick spent 15k on coffee` parses: amount = 15,000; type = debit; description = "coffee"; date = today.
- `/quick terima 1.5jt gaji kemarin` parses: amount = 1,500,000; type = credit; description = "gaji"; date = yesterday.
- Clicking "Confirm Save" adds the transaction to the database, updates the balance, and shows the updated net balance.
- All code formatted to Google Python style, with tests covering parsing accuracy (>80% coverage).
