# Product Guidelines: Savings & Financial Transaction Telegram Chatbot

## Branding & Voice
*   **Tone**: Simple, clear, and efficient. The bot is a personal utility tool, not a conversational assistant. Messages should be concise and actionable.
*   **Personality**: Professional, helpful, and transparent.
*   **Language**: English (default).

## User Experience (UX) Principles
1.  **Speed is Key**: Logging a transaction should take less than 10 seconds. Minimize the number of steps and text prompts required.
2.  **No Message Clutter**: Clean up user input messages or use Telegram Inline Keyboards where possible to keep the chat history organized.
3.  **Graceful Degradation**: If user input is invalid, explain why and present options/buttons rather than just printing generic error messages.
4.  **Security/Privacy Guidance**: Advise the user to keep the bot token private and remind them that the database resides locally.

## Design Systems & Layouts
*   **Formatting**: Use Markdown V2 or HTML styling in Telegram messages for readability.
    -   *Debits/Expenses* should be clearly labeled (e.g., using red emoji `- 💸 $50.00`).
    -   *Credits/Income* should be clearly labeled (e.g., using green emoji `+ 💰 $100.00`).
    -   *Balances* should use bold format and be easy to scan.
*   **Inline Keyboards**: Use inline buttons for frequent selections (e.g., selecting Debit vs Credit, selecting pre-defined categories).
