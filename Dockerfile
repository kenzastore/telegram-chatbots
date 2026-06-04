FROM python:3.8-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY config.py db.py bot.py sheets.py ./

ENV DATABASE_PATH=/app/data/finance.db

RUN mkdir -p /app/data

CMD ["python", "bot.py"]
