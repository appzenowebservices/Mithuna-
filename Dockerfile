# ---------- builder (Vite production build) ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- runner (static files + backend proxies on :3000) ----------
FROM nginx:alpine AS runner
# envsubst template -> /etc/nginx/conf.d/default.conf (handled by the
# stock nginx entrypoint). PAPERCLIP_UPSTREAM / HERMES_UPSTREAM come
# from compose environment, defaults keep nginx starting when env or
# backends are missing (requests then 502 instead of emerg crash-loop).
ENV PAPERCLIP_UPSTREAM="appzeno-agent-panel:3100" HERMES_UPSTREAM="hermes:8765"
COPY nginx.default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
