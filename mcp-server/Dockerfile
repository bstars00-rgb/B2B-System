# ELLIS MCP Server — stdio 기반 MCP 서버
# 실행 예: docker run -i --rm -e MOCK_MODE=true ellis-mcp

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
# stdio transport — 포트 노출 없음. 반드시 -i (interactive) 로 실행할 것.
ENTRYPOINT ["node", "dist/server.js"]
