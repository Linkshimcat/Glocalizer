# Build context는 repository root를 전제로 한다. supabase migration을 production image에 함께 넣기 위해서다.
FROM node:22-slim AS build
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json backend/tsconfig.scripts.json ./
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/python ./python
COPY supabase/migrations /supabase/migrations
RUN npm run build && npx tsc -p tsconfig.scripts.json

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# python 스크립트는 build 스테이지에서 저장소 루트 기준으로 복사한 뒤 스테이지 간
# 복사로 넘긴다. runtime 스테이지에서 빌드 컨텍스트를 직접 참조하면 캐시 키 계산이
# 깨지는 문제가 있어, dist와 동일하게 --from=build 패턴으로 통일한다.
COPY --from=build /app/python ./python
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip libgomp1 \
  && python3 -m pip install --no-cache-dir --break-system-packages -r python/requirements.txt \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY --from=build /supabase/migrations /supabase/migrations

EXPOSE 3000
CMD ["node", "dist/index.js"]
