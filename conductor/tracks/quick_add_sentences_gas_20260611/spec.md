# Specification - Quick Add Transaction via Typed Sentences - GAS Refactor

## Overview
This track refactors and adapts the natural language parsing logic of the `/quick` command from the Python chatbot codebase to Google Apps Script. It introduces a robust, regex-based parsing engine in TypeScript that handles relative dates, numeric date formats, and textual dates in both English and Indonesian, formats transaction descriptions correctly, and utilizes the existing GAS chatbot inline confirmation keyboard for final database commits.

## Functional Requirements
1. **Natural Language Parsing Engine (`parseTransactionSentence`)**:
   - Parses the input sentence into `amount`, `type`, `date`, and `description`.
   - **Timezone**: Relative dates (today, yesterday, etc.) must be calculated relative to `Asia/Jakarta` (GMT+7) timezone.
   - **Date Formats Supported**:
     - *Relative*: `today` / `hari ini`, `yesterday` / `kemarin`.
     - *Numeric YYYY-MM-DD*: `2026-06-08`, `2026/06/08`, `2026.06.08`.
     - *Numeric DD-MM-YYYY*: `08-06-2026`, `08/06/2026`, `08.06.2026`.
     - *Numeric DD-MM*: `08-06`, `08/06` (assumes current year).
     - *Textual DD Month YYYY*: `8 June 2026`, `08 Juni 2026`, `8 Jun 2026`.
     - *Textual DD Month*: `8 June`, `08 Juni`, `8 Jun` (assumes current year).
     - *Textual Month DD YYYY*: `June 8, 2026`, `Juni 8 2026`, `Jun 8, 2026`.
     - *Textual Month DD*: `June 8`, `Juni 08`, `Jun 8` (assumes current year).
   - **Month Names Supported**:
     - English: January/Jan, February/Feb, March/Mar, April/Apr, May, June/Jun, July/Jul, August/Aug, September/Sep, October/Oct, November/Nov, December/Dec.
     - Indonesian: Januari/Jan, Februari/Feb/Peb, Maret/Mar, April/Apr, Mei, Juni/Jun, Juli/Jul, Agustus/Agt/Agus, September/Sep, Oktober/Okt, November/Nov/Nop, Des/Desember.
   - **Description Cleaning**:
     - Remainder of sentence after removing amount, type, and date matches.
     - Strip leading and trailing prepositions: `for`, `on`, `untuk`, `di`, `dari`, `at`, `bagi`, `pada`, `ke`, `about`, `buat`, `the`, `a`, `an`, `in`.
     - Clean up extra spaces and return a clean description.

2. **Confirmation Interaction**:
   - Sends parsed details to the user and stores temporary transaction details in `PropertiesService` under script properties.
   - Uses the existing inline keyboard buttons: `✅ Yes, Save` (callback: `quick_confirm_yes`) and `❌ Cancel` (callback: `quick_confirm_no`).
   - On confirmation, commits to the spreadsheet database, recalculates balances, and shows the updated balance.
   - On cancellation, deletes temporary properties and cancels the operation.

## Non-Functional Requirements
- **Local & Deterministic**: The parsing engine must use pure regex-based logic and date manipulation, running entirely locally in Google Apps Script without external service/LLM dependencies.
- **Unit Testing**: Deliver comprehensive Jest test cases in `tests/quick.test.ts` covering all date formats, amount prefixes/suffixes, and description cleanups. Keep test coverage of `quick.ts` >80%.

## Acceptance Criteria
- `/quick` command displays correct usage text when invoked with empty arguments.
- `/quick spent 50k on coffee today` parses successfully with amount = 50,000, type = debit, description = "coffee", date = today.
- Textual and numeric dates listed in functional requirements are correctly parsed into `YYYY-MM-DD` ISO strings.
- All unit tests pass, and linter/type checking succeed.
