FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
COPY dist ./dist
RUN mkdir /data && chown node:node /data
USER node
ENV HOST=0.0.0.0 PORT=4173 NODE_ENV=production DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 4173
CMD ["node","server.mjs"]
