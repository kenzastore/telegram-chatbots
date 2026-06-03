# Implementation Plan - Build core chatbot commands and database integration

## Phase 1: Project Scaffolding and SQLite Setup

- [ ] Task: Setup Project Scaffolding
    - [ ] Initialize Python virtual environment, create `.gitignore`, `.env.example`, and requirements.txt (packages: `python-telegram-bot`, `pytest`, `pytest-cov`, `pytest-asyncio`, `python-dotenv`).
    - [ ] Set up basic configuration module (`config.py`) to read `TELEGRAM_BOT_TOKEN` and `DATABASE_PATH`.
- [ ] Task: Database Module Implementation
    - [ ] Write failing unit tests for database schema initialization and CRUD operations (`init_db`, `add_transaction`, `get_balance`, `get_history`, `get_summaries`).
    - [ ] Implement `db.py` to pass the unit tests using SQLite.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Project Scaffolding and SQLite Setup' (Protocol in workflow.md)

## Phase 2: Bot Setup and Core Commands

- [ ] Task: Bot Setup & Basic Commands (/start, /help)
    - [ ] Write failing unit tests mocking Telegram updates for bot configuration, `/start`, and `/help` command triggers.
    - [ ] Implement `bot.py` with handlers for `/start` and `/help` using HTML or Markdown formatting.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Transaction Logging Flow (/add)
    - [ ] Write failing unit tests for `/add` command conversation handling (selecting debit/credit, inputting amount, description, confirmation).
    - [ ] Implement ConversationHandler in `bot.py` for `/add` transaction flow.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Balance and History Commands (/balance, /view)
    - [ ] Write failing unit tests for `/balance` and `/view` commands.
    - [ ] Implement handlers for `/balance` and `/view` commands in `bot.py`.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Summary Command (/summary)
    - [ ] Write failing unit tests for `/summary` command.
    - [ ] Implement handler for `/summary` command in `bot.py` to aggregate weekly/monthly debits and credits.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Bot Setup and Core Commands' (Protocol in workflow.md)

## Phase 3: Dockerization & Final Polish

- [ ] Task: Docker Integration
    - [ ] Write Dockerfile and docker-compose.yml to containerize the bot.
    - [ ] Validate that the container can build and run successfully locally.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Dockerization & Final Polish' (Protocol in workflow.md)
