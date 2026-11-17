FROM node:22-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json package-lock.json settings.json server.mjs db.mjs store.mjs ./
COPY --chown=node:node web ./web
RUN mkdir /app/data && chown node:node /app/data
ENV HOST=0.0.0.0 PORT=8080 APP_DATA_DIR=/app/data NODE_ENV=production
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
