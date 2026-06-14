# Specification: Virtual Keyboard Command Menu

## Overview
Implement a persistent custom Reply Keyboard (virtual keyboard) that acts as a quick-access panel for the bot's features. This keyboard replaces the user's standard keyboard and presents buttons for the primary bot commands.

## Functional Requirements
1. **Keyboard Layout Structure**:
   - The custom Reply Keyboard must have a grid layout as follows:
     - **Row 1**: `[/quick]`
     - **Row 2**: `[/add]`, `[/balance]`, `[/view]`
     - **Row 3**: `[/clear]`, `[/edit]`, `[/summary]`
     - **Row 4**: `[/help]`
   - The keyboard must be configured with `resize_keyboard: true` and `one_time_keyboard: false` to ensure it is persistent and compact.

2. **Triggering/Attachment Conditions**:
   - The custom Reply Keyboard must be sent as the `reply_markup` of the response message:
     - When the `/start` command is executed.
     - When a stateless command finishes: `/help`, `/google_login`, `/google_logout`, `/cancel`, `/balance`, `/view`, `/summary`, `/debug`.
     - When a stateful workflow completes or terminates: `/add` final step (saved), `/quick` (saved or cancelled), `/clear` (confirmed, cancelled, or error), `/edit` (saved, cancelled, or error).
     - When a user gets blocked by the Google Login gate or triggers the unknown command/fallback message.

3. **Behavior**:
   - Since these buttons send direct slash commands (e.g. `/add`), the Telegram client automatically sends them as plain text. The existing message routing will handle them natively without requiring callback routing.

## Technical Scope
- **File Changes**:
  - `handlers.ts`:
    - Implement a helper `getCommandMenuReplyMarkup()` returning the reply keyboard layout.
    - Pass this markup to the final messages sent at the end of `/balance`, `/view`, `/summary`, `saveAndConfirmAddTransaction`, etc.
  - `router.ts`:
    - Pass this markup to public commands (`/start`, `/help`, `/google_login`, `/google_logout`, `/cancel`, `/debug`), unknown commands, and login gates.
