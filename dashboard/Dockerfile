# Dashboard de Vela. Imagen propia en vez de Nixpacks: el shim de corepack
# falla con pnpm 11 en Node 24 (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING), asi
# que aqui pnpm se instala con npm y la version de Node queda fijada.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 CI=1
RUN npm install -g pnpm@11.24.0

# ---- dependencias -----------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ------------------------------------------------------------------
# Las NEXT_PUBLIC_* van dentro del bundle: Railway las pasa como build args si
# estan declaradas aqui (Settings → Variables del servicio).
FROM deps AS build
ARG NEXT_PUBLIC_SIGNALING_URL
ARG NEXT_PUBLIC_SIGNALING_TOKEN
ENV NEXT_PUBLIC_SIGNALING_URL=$NEXT_PUBLIC_SIGNALING_URL \
    NEXT_PUBLIC_SIGNALING_TOKEN=$NEXT_PUBLIC_SIGNALING_TOKEN
COPY . .
RUN pnpm build

# ---- runtime ----------------------------------------------------------------
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./
EXPOSE 3000
CMD ["pnpm", "start"]
