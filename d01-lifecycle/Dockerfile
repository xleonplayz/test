FROM node:22-bookworm-slim
WORKDIR /app
COPY . .
ENV HOST=0.0.0.0 NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "fixture.mjs"]
