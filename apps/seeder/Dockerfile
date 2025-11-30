FROM python:3.10-slim

WORKDIR /app

RUN pip install mlflow boto3

COPY seed.py .
# Models will be mounted at /app/models

CMD ["python", "seed.py"]
