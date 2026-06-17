# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV NITRO_PRESET=node-server

COPY --from=build /app/.output ./.output

EXPOSE 10000
CMD ["node", ".output/server/index.mjs"]
