# Specification: Inline Keyboard Command Menu

## Overview
Implement an always-available inline keyboard "Command Menu" that acts as a quick-access panel for the bot's features. This keyboard will be presented as a separate "Command Menu" message with inline buttons representing the primary commands.

## Functional Requirements
1. **Triggering Conditions**:
   - The Command Menu must be sent as a separate message:
     - When the `/start` command is executed.
     - At the end of every command or interactive flow completion (i.e. when a transaction/action is finalized, cancelled, or when a stateful workflow terminates and clears the user's state).
     - This includes: `/start`, `/help`, `/google_login`, `/google_logout`, `/cancel`, `/balance`, `/view`, `/summary`, `/debug`.
     - It also includes the final step of `/add` (transaction saved), `/quick` (transaction saved or cancelled), `/clear` (deletion confirmed or cancelled), and `/edit` (modification saved or cancelled).

2. **Keyboard Layout Structure**:
   - The inline keyboard must have a grid layout as follows:
     - **Row 1**: `[⚡ /quick]` (Callback data: `menu_/quick`)
     - **Row 2**: `[➕ /add]` (Callback data: `menu_/add`), `[💰 /balance]` (Callback data: `menu_/balance`), `[📅 /view]` (Callback data: `menu_/view`)
     - **Row 3**: `[🗑️ /clear]` (Callback data: `menu_/clear`), `[✏️ /edit]` (Callback data: `menu_/edit`), `[📊 /summary]` (Callback data: `menu_/summary`)
     - **Row 4**: `[ℹ️ /help]` (Callback data: `menu_/help`)

3. **Callback Handling**:
   - When a button from the Command Menu is clicked, the bot should handle the callback query:
     - For `menu_/quick`: Send a message prompt instructing the user how to quick-add, e.g.:
       "👉 Please send your transaction in a quick sentence, e.g.:\n<code>/quick 50k lunch today</code> or <code>10000 bakso kemarin</code>"
     - For other commands (`menu_/add`, `menu_/balance`, `menu_/view`, `menu_/clear`, `menu_/edit`, `menu_/summary`, `menu_/help`), it should trigger the corresponding command logic just as if the user typed the slash command directly.
     - Ensure the callback query is answered via `answerCallbackQuery` to prevent Telegram loading spinners.

## Technical Scope
- **File Changes**:
  - `router.ts`:
    - Add/update routing for callback data prefix `menu_` under `handleCallbackQuery`.
    - Update command handlers or the `routeUpdate` flow to automatically send the Command Menu message at the end of each command execution.
  - `handlers.ts`:
    - Implement a reusable function `sendCommandMenu(chatId: number, token: string)` that sends the keyboard message.
    - Call `sendCommandMenu` in the appropriate final/exit functions of `/add`, `/quick`, `/clear`, `/edit`, etc.
  - `tests/`: Add unit tests to verify that the command menu message is triggered correctly.
