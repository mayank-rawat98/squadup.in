# ----------------------------
# 1️⃣ DEPENDENCIES STAGE
# ----------------------------
FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig.base.json ./
# This is an npm-workspaces monorepo: apps/api declares its own manifest, so it
# has to be present before install for npm to resolve the workspace.
COPY apps/api/package.json ./apps/api/package.json

# Install workspace dependencies
RUN npm install


# ----------------------------
# 2️⃣ BUILD STAGE
# ---------------------------
FROM deps AS builder

COPY apps/api ./apps/api

# NX_NO_CLOUD: no Nx Cloud token exists inside the image build, and cloud
# caching/distribution is not needed here.
#
# --skipSync: the image context is a partial checkout (apps/api only), so the
# @nx/js:typescript-sync generator sees every other project as a stale
# reference and fails the build. Project references are already correct in the
# committed source — there is nothing for it to do here.
RUN NX_NO_CLOUD=true npx nx build @squadup.in/api --skipSync

# Compile the TypeORM data source + migrations to plain CommonJS so they can run
# in the production image (which has no ts-node / source tree). Output lands in
# apps/api/dist-migrations and is executed via the `typeorm` CLI at deploy time.
RUN npx tsc -p apps/api/tsconfig.migrations.json


# ----------------------------
# 3️⃣ PRODUCTION
# ----------------------------
FROM node:24-alpine AS production

WORKDIR /app

# copy only necessary files.
COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm install --omit=dev --ignore-scripts

# copy build result
COPY --from=builder /app/apps/api/dist ./dist

# Compiled migrations + data source, run via the typeorm CLI before deploy.
COPY --from=builder /app/apps/api/dist-migrations ./dist-migrations

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/main.js"]
