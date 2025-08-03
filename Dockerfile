FROM node:18-alpine

# Install system dependencies for native modules
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  git

WORKDIR /app

# Copy package files first for better caching
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs

EXPOSE 3000

CMD ["yarn", "dev"]
