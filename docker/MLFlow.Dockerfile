FROM python:3.10-slim

WORKDIR /app

RUN pip install mlflow psycopg2-binary

EXPOSE 5000

CMD ["sh", "-c", "mlflow server --host 0.0.0.0 --allowed-hosts '*' --cors-allowed-origins '*' --backend-store-uri postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB} --port ${PORT:-5000}"]