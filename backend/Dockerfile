FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY python/requirements.txt ./python/requirements.txt
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip libgomp1 \
  && python3 -m pip install --no-cache-dir --break-system-packages -r python/requirements.txt \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
# python 스크립트는 컴파일 대상이 아니라 build 스테이지에 없으므로 저장소에서 직접 복사
COPY python ./python

EXPOSE 3000
CMD ["node", "dist/index.js"]
