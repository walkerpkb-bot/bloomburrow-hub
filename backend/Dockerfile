FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Stash templates so the entrypoint can seed them into the data volume
RUN mkdir -p /app/seed && cp -r data/templates /app/seed/templates

# Ensure data directories exist
RUN mkdir -p data/campaigns data/images data/templates

RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
