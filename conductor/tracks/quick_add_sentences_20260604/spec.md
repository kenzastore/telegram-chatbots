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
      - Parses relative dates and absolute dates in various formats (supporting both English and Indonesian month names).
      - **Relative Dates**:
        - `yesterday` or `kemarin` -> Yesterday's date.
        - `today` or `hari ini` -> Today's date.
      - **Numeric Dates**:
        - `YYYY-MM-DD` (e.g., `2026-06-08`, `2026/06/08`, `2026.06.08`)
        - `DD-MM-YYYY` (e.g., `08-06-2026`, `08/06/2026`, `08.06.2026`)
        - `DD-MM` (e.g., `08-06`, `08/06`, `08.06`) -> assumes the current year.
      - **Textual Dates** (case-insensitive, optional comma before/after year):
        - `DD Month YYYY` (e.g., `8 June 2026`, `08 Juni 2026`, `8 Jun 2026`)
        - `DD Month` (e.g., `8 June`, `08 Juni`, `8 Jun`) -> assumes the current year.
        - `Month DD YYYY` (e.g., `June 8, 2026`, `Juni 8 2026`, `Jun 8, 2026`)
        - `Month DD` (e.g., `June 8`, `Juni 08`, `Jun 8`) -> assumes the current year.
      - **Month Names Supported**:
        - English: January/Jan, February/Feb, March/Mar, April/Apr, May, June/Jun, July/Jul, August/Aug, September/Sep, October/Oct, November/Nov, December/Dec.
        - Indonesian: Januari/Jan, Februari/Feb/Peb, Maret/Mar, April/Apr, Mei, Juni/Jun, Juli/Jul, Agustus/Agt/Agus, September/Sep, Oktober/Okt, November/Nov/Nop, Des/Desember.
      - **Default**: Default to the current date (Today) if no date pattern matches.
    - **Description Extraction**:
      - The remainder of the sentence after removing matched command, amount, type keywords, and date keywords/patterns.
      - Clean up extra spaces, prepositions (e.g., `for`, `on`, `untuk`, `di`, `dari`, `at`, `bagi`, `pada`, `ke`, `about`, `buat`, `the`, `a`, `an`, `in`), and return a clean description. E.g., `/quick spent 50000 on lunch yesterday` -> Description: `lunch`.

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
- `/quick` parses various date formats correctly:
  - Relative: `yesterday` / `kemarin`
  - Numeric YYYY-MM-DD: `2026-06-08`, `2026/06/08`, `2026.06.08`
  - Numeric DD-MM-YYYY: `08-06-2026`, `08/06/2026`, `08.06.2026`
  - Numeric DD-MM: `08-06`, `08/06` (uses current year)
  - Textual DD Month YYYY: `8 June 2026`, `08 Juni 2026`
  - Textual DD Month: `8 June`, `08 Juni` (uses current year)
  - Textual Month DD YYYY: `June 8, 2026`, `Juni 8 2026`
  - Textual Month DD: `June 8`, `Juni 08` (uses current year)
- Clicking "Confirm Save" adds the transaction to the database, updates the balance, and shows the updated net balance.
- All code formatted to Google Python style, with tests covering parsing accuracy (>80% coverage).
