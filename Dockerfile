# ──────────────────────────────────────────────────────────────
#  RiskTrace — Frontend (Angular 18 + Nginx)
#  Multi-stage build: Node build → Nginx static serve
# ──────────────────────────────────────────────────────────────

# ── Stage 1: Build the Angular app ───────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration=production

# ── Stage 2: Serve with Nginx ────────────────────────────────
FROM nginx:alpine
# Remove default Nginx page
RUN rm -rf /usr/share/nginx/html/*
# Angular 18 with the application builder outputs to dist/<project>/browser
COPY --from=build /app/dist/angular-v18-app/browser /usr/share/nginx/html
# Custom Nginx config for Angular SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
