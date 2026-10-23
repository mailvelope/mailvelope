# Mailvelope build for the OSS Scanner. Network is available only during this build, so npm ci also fetches
# the Chrome binary Puppeteer uses for the integration tests (to /root/.cache/puppeteer).
FROM node:24-bookworm
ENV DEBIAN_FRONTEND=noninteractive
# Runtime libraries for Puppeteer's Chrome
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates git python3 \
      fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 libdrm2 \
      libgbm1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libx11-xcb1 libxcomposite1 \
      libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 libxss1 libxtst6 \
    && rm -rf /var/lib/apt/lists/*

# scanner contract: the checkout lives inside the image, at /src
COPY . /src
WORKDIR /src

# Dev build of the extension to build/chrome and build/firefox, plus the bundle the integration tests load
RUN npm ci \
    && npx grunt \
    && npm run build:integration

# Smoke run of unit and integration tests; failures must not abort the build
RUN npm test -- --maxWorkers=2 || echo "WARNING: jest reported failures"
