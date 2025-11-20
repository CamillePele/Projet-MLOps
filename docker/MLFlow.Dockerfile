FROM python:3.10-slim

WORKDIR /app

RUN pip install mlflow psycopg2-binary

# Create artifacts directory
RUN mkdir -p /mlflow/artifacts

EXPOSE 5000

CMD ["sh", "-c", "mlflow server --host 0.0.0.0 --allowed-hosts '*' --cors-allowed-origins '*' --backend-store-uri postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB} --default-artifact-root ${MLFLOW_ARTIFACT_ROOT:-/mlflow/artifacts} --artifacts-destination ${MLFLOW_ARTIFACT_ROOT:-/mlflow/artifacts} --serve-artifacts --port ${PORT:-5000}"]