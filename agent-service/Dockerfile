FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY worker ./worker

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:8000/agent/health -H "X-Agent-Service-Secret: $AGENT_SERVICE_SECRET" || exit 1

# Overridden by docker-compose for the `worker` service
# (python -m worker.main) — this image serves the FastAPI app by default.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
