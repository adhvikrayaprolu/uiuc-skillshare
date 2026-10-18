FROM node:22.23.1-bookworm-slim AS frontend-check
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_BASE_URL=/api VITE_USE_MOCKS=false VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM python:3.13-slim-bookworm AS application
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --require-hashes -r requirements.txt \
    && groupadd --gid 10001 skillshare && useradd --uid 10001 --gid 10001 --create-home skillshare \
    && mkdir -p /data/media && chown skillshare:skillshare /data/media
COPY backend/ ./
COPY --from=frontend-check /frontend/dist ./frontend_dist
RUN ENVIRONMENT=local DEBUG=False python manage.py collectstatic --noinput
USER skillshare
EXPOSE 8000
CMD ["gunicorn", "skillswap_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "30", "--access-logfile", "-"]
