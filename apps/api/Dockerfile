# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
# Alpine não vem com OpenSSL instalado por padrão. Sem isso, a detecção de
# versão do Prisma (tanto em `prisma generate` quanto ao carregar o query
# engine em runtime) falha e ele chuta "openssl-1.1.x", que não existe na
# imagem — causa raiz real do "Error loading shared library libssl.so.1.1",
# não apenas uma questão de qual binaryTarget foi declarado no schema.
RUN apk add --no-cache openssl
WORKDIR /repo
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

# ---- build: código-fonte é copiado ANTES do install, de propósito.
# Copiar depois do install (padrão comum em Dockerfiles de projeto único)
# quebra em monorepo pnpm: node_modules tem symlinks para fora de apps/api/
# (para a store em node_modules/.pnpm/ na raiz), e COPY sobre um diretório
# já existente substitui todo o conteúdo do destino — apaga esse
# node_modules antes de qualquer comando rodar. Este é o padrão oficial do
# pnpm para Docker (https://pnpm.io/docker). Ver ADR correspondente. ----
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @rip/api...
RUN pnpm --filter @rip/api prisma:generate
RUN pnpm --filter @rip/api build
# --legacy: workspace usa symlinks (modo padrão), não injectWorkspacePackages.
RUN pnpm --filter @rip/api deploy --prod --legacy /prod/api

# ---- runtime: imagem final mínima, só dependências de produção, usuário não-root ----
FROM node:24-alpine AS runtime
# Mesmo motivo do estágio `base` (ver comentário lá): este estágio parte de
# node:24-alpine "do zero", não herda o apk do build — o engine do Prisma
# roda AQUI, então o OpenSSL precisa estar presente aqui também.
RUN apk add --no-cache openssl
ENV NODE_ENV=production
# Propriedade do artefato (esta imagem), não do container em runtime — por
# isso é ARG/ENV fixado no build, não uma variável passada via `docker run -e`.
# Setar com: docker build --build-arg BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ARG BUILD_TIMESTAMP=unknown
ENV BUILD_TIMESTAMP=$BUILD_TIMESTAMP
RUN addgroup -S app && adduser -S app -G app
WORKDIR /repo/apps/api
COPY --from=build /prod/api ./
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
