FROM python:3-slim

WORKDIR /usr/src/backend/

COPY . .

RUN pip install --no-cache-dir --upgrade -r ./app/requirements.txt

CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]