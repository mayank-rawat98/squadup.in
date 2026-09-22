# ----------------------------
# 1️⃣ DEPENDENCIES STAGE
# ----------------------------
FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./
# @squadup.in/ui is an unpublished npm-workspace lib under libs/. Its manifest
# (and this app's) must be present before installing so npm-workspaces links it
# locally — otherwise npm tries to fetch it from the registry and 404s.
COPY libs/ui/package.json ./libs/ui/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm install


# ----------------------------
# 2️⃣ BUILD STAGE
# ----------------------------
FROM deps AS builder

COPY tsconfig.base.json tsconfig.json ./
COPY libs/ui ./libs/ui
COPY apps/web ./apps/web

# Plain `next build` rather than `nx build`: that is all the Nx target runs,
# and it avoids Nx's project-graph and tsconfig sync on a trimmed workspace.
# The shared UI lib is compiled from source by Next (transpilePackages).
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && npx next build


# ----------------------------
# 3️⃣ PRODUCTION STAGE (Next.js standalone server)
# ----------------------------
FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Standalone output is traced from the workspace root, so it mirrors the repo
# layout: the server entry sits at apps/web/server.js. Static assets and
# public/ are not part of the trace and are copied in beside it.
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

USER node

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
