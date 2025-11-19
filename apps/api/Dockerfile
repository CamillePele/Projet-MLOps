FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

ENV NODE_ENV=development

CMD ["pnpm", "run", "start:dev", "--preserveWatchOutput"]
