# Custom backend image built on top of the plain alpine base image
FROM alpine:3.20

# Install Node.js and npm from the Alpine package repository
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Install dependencies first so this layer is cached between code changes
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./

# Directory for uploaded files (a named Docker volume is mounted here)
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
