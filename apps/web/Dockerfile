# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /repo
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

# ---- build: código-fonte copiado ANTES do install — mesmo motivo do
# apps/api/Dockerfile (ver comentário lá): COPY sobre node_modules já
# populado apaga os symlinks do pnpm. Padrão oficial: https://pnpm.io/docker ----
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @rip/web...
# Vite embute VITE_* no bundle em tempo de build (nunca em runtime) — por
# isso precisa ser ARG aqui, não uma env do container final. Plataformas como
# Railway populam automaticamente um ARG que tenha o mesmo nome de uma
# variável de serviço configurada no dashboard.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @rip/web build

# ---- runtime: serve os assets estáticos gerados pelo Vite ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
