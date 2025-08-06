FROM ubuntu:22.04

# Database environment variables will be set by docker-compose.yml
ENV PGDATA=/var/lib/postgresql/data
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies in a single layer
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    vim \
    tini \
    sudo \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Node.js 18.x (LTS) and Yarn
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && npm cache clean --force

WORKDIR /app

# Copy package files first for better caching
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs

EXPOSE 3000 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/status || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["yarn", "dev"]
