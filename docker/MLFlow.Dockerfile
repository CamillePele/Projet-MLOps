FROM python:3.10-slim

WORKDIR /app

# Installation des dépendances (mlflow, postgres driver, boto3 pour S3)
RUN --mount=type=cache,target=/root/.cache/pip pip install mlflow psycopg2-binary boto3

EXPOSE 5000

CMD ["sh", "-c", "mlflow server \
    --host 0.0.0.0 \
    --port 5000 \
    --backend-store-uri postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB} \
    --default-artifact-root s3://mlflow \
    --artifacts-destination s3://mlflow \
    --serve-artifacts \
    --allowed-hosts '*' \
    --cors-allowed-origins '*' "]