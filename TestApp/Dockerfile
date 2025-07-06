FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

COPY requirements.txt /app/

RUN pip install --upgrade pip && pip install -r requirements.txt

COPY testapp/ /app/

RUN python manage.py collectstatic --noinput
RUN python manage.py migrate

CMD ["gunicorn", "testapp.wsgi:application", "--bind", "0.0.0.0:8000"]
