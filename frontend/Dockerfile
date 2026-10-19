# Custom frontend image built on top of the plain alpine base image
FROM alpine:3.20

# Install the Nginx web server from the Alpine package repository
RUN apk add --no-cache nginx

# Nginx config: serve static files and proxy /api requests to the backend container
COPY nginx.conf /etc/nginx/http.d/default.conf

# Static website files
COPY public/ /usr/share/nginx/html/

EXPOSE 80

# Run nginx in the foreground so the container keeps running
CMD ["nginx", "-g", "daemon off;"]
