FROM python:3.12-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


FROM python:3.12-slim

RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app
COPY --from=builder /install /usr/local
COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && chown -R appuser:appuser /app \
    && mkdir -p /images \
    && chown appuser:appuser /images

USER appuser

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
