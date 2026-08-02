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
RUN pnpm --filter @rip/web build

# ---- runtime: serve os assets estáticos gerados pelo Vite ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
