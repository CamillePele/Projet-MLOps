FROM python:3.10-slim

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/pip pip install mlflow boto3

COPY seed.py .
# Models will be mounted at /app/models

CMD ["python", "seed.py"]
