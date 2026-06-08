# Implementation Plan - Build core chatbot commands and database integration

## Phase 1: Project Scaffolding and SQLite Setup [checkpoint: d641371]

- [x] Task: Setup Project Scaffolding (b7224a5)
    - [x] Initialize Python virtual environment, create `.gitignore`, `.env.example`, and requirements.txt (packages: `python-telegram-bot`, `pytest`, `pytest-cov`, `pytest-asyncio`, `python-dotenv`).
    - [x] Set up basic configuration module (`config.py`) to read `TELEGRAM_BOT_TOKEN` and `DATABASE_PATH`.
- [x] Task: Database Module Implementation (bcdae2a)
    - [x] Write failing unit tests for database schema initialization and CRUD operations (`init_db`, `add_transaction`, `get_balance`, `get_history`, `get_summaries`).
    - [x] Implement `db.py` to pass the unit tests using SQLite.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Project Scaffolding and SQLite Setup' (Protocol in workflow.md)

## Phase 2: Bot Setup and Core Commands [checkpoint: 0948b94]

- [x] Task: Bot Setup & Basic Commands (/start, /help) (49966c0)
    - [x] Write failing unit tests mocking Telegram updates for bot configuration, `/start`, and `/help` command triggers.
    - [x] Implement `bot.py` with handlers for `/start` and `/help` using HTML or Markdown formatting.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Transaction Logging Flow (/add) (3783b6d)
    - [x] Write failing unit tests for `/add` command conversation handling (selecting debit/credit, inputting amount, description, confirmation).
    - [x] Implement ConversationHandler in `bot.py` for `/add` transaction flow.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Balance and History Commands (/balance, /view) (1307d95)
    - [x] Write failing unit tests for `/balance` and `/view` commands.
    - [x] Implement handlers for `/balance` and `/view` commands in `bot.py`.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Summary Command (/summary) (20be543)
    - [x] Write failing unit tests for `/summary` command.
    - [x] Implement handler for `/summary` command in `bot.py` to aggregate weekly/monthly debits and credits.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Bot Setup and Core Commands' (Protocol in workflow.md)

## Phase 3: Dockerization & Final Polish [checkpoint: b3001fe]

- [x] Task: Docker Integration (17cb757)
    - [x] Write Dockerfile and docker-compose.yml to containerize the bot.
    - [x] Validate that the container can build and run successfully locally.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Dockerization & Final Polish' (Protocol in workflow.md) (b3001fe)
