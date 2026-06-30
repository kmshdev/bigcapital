#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-production}"
BRANCH="${RAILWAY_SOURCE_BRANCH:-feat/add-indian-owner-access-controls}"
SOURCE_REPO="${RAILWAY_SOURCE_REPO:-}"
CALLER="${RAILWAY_CALLER:-skill:use-railway@1.3.0}"
SESSION="${RAILWAY_AGENT_SESSION:-bookeepz-railway-config-$$}"

required_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

railway_cmd() {
  RAILWAY_CALLER="$CALLER" RAILWAY_AGENT_SESSION="$SESSION" railway "$@"
}

service_exists() {
  local name="$1"
  railway_cmd service list --environment "$ENVIRONMENT" --json |
    node -e '
      const target = process.argv[1];
      let input = "";
      process.stdin.on("data", chunk => input += chunk);
      process.stdin.on("end", () => {
        const data = JSON.parse(input || "[]");
        const services = Array.isArray(data) ? data : data.services || data.edges || [];
        const found = services.some((entry) => {
          const node = entry.node || entry;
          return node.name === target || node.serviceName === target;
        });
        process.exit(found ? 0 : 1);
      });
    ' "$name"
}

environment_is_linked() {
  local name="$1"
  railway_cmd environment list --json |
    node -e '
      const target = process.argv[1];
      let input = "";
      process.stdin.on("data", chunk => input += chunk);
      process.stdin.on("end", () => {
        const data = JSON.parse(input || "[]");
        const environments = Array.isArray(data) ? data : data.environments || data.edges || [];
        const found = environments.some((entry) => {
          const node = entry.node || entry;
          return node.name === target && node.isLinked === true;
        });
        process.exit(found ? 0 : 1);
      });
    ' "$name"
}

ensure_service() {
  local name="$1"
  if service_exists "$name"; then
    echo "Service exists: $name"
  else
    railway_cmd add --service "$name" --json >/dev/null
    echo "Created service: $name"
  fi
}

ensure_database() {
  local service_name="$1"
  local engine="$2"
  if service_exists "$service_name"; then
    echo "Database service exists: $service_name"
  else
    railway_cmd add --database "$engine" --json >/dev/null
    echo "Created Railway managed $engine database. Rename it to $service_name if Railway assigned a different name."
  fi
}

set_var() {
  local service="$1"
  local assignment="$2"
  railway_cmd variable set "$assignment" \
    --service "$service" \
    --environment "$ENVIRONMENT" \
    --skip-deploys >/dev/null
}

set_source_repo_if_present() {
  local service="$1"
  if [ -n "$SOURCE_REPO" ]; then
    railway_cmd environment edit --environment "$ENVIRONMENT" \
      --service-config "$service" source.repo "$SOURCE_REPO" >/dev/null
  fi
}

required_cmd railway
required_cmd node

if ! environment_is_linked "$ENVIRONMENT"; then
  echo "Railway environment must exist and be linked before creating services: $ENVIRONMENT" >&2
  echo "Run: railway environment link $ENVIRONMENT" >&2
  exit 1
fi

ensure_service "bookeepz-server"
ensure_service "bookeepz-webapp"
ensure_service "gotenberg"
ensure_database "MySQL" "mysql"
ensure_database "Redis" "redis"

railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-server" build.builder DOCKERFILE >/dev/null
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-server" build.dockerfilePath "packages/server/Dockerfile" >/dev/null
set_source_repo_if_present "bookeepz-server"
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-server" source.branch "$BRANCH" >/dev/null
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-server" deploy.healthcheckPath "/api/system_db" >/dev/null
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-server" deploy.healthcheckTimeout 120 >/dev/null

railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-webapp" build.builder DOCKERFILE >/dev/null
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-webapp" build.dockerfilePath "packages/webapp/Dockerfile.railway" >/dev/null
set_source_repo_if_present "bookeepz-webapp"
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-webapp" source.branch "$BRANCH" >/dev/null
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-webapp" deploy.healthcheckPath "/" >/dev/null
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "bookeepz-webapp" deploy.healthcheckTimeout 120 >/dev/null

railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "gotenberg" source.image "gotenberg/gotenberg:7" >/dev/null
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "gotenberg" deploy.healthcheckPath "/health" >/dev/null
railway_cmd environment edit --environment "$ENVIRONMENT" \
  --service-config "gotenberg" deploy.healthcheckTimeout 120 >/dev/null

set_var "bookeepz-webapp" 'BOOKEEPZ_SERVER_PRIVATE_HOST=${{bookeepz-server.RAILWAY_PRIVATE_DOMAIN}}'

set_var "bookeepz-server" "NODE_ENV=production"
set_var "bookeepz-server" 'DB_HOST=${{MySQL.MYSQLHOST}}'
set_var "bookeepz-server" 'DB_PORT=${{MySQL.MYSQLPORT}}'
set_var "bookeepz-server" 'DB_USER=${{MySQL.MYSQLUSER}}'
set_var "bookeepz-server" 'DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}'
set_var "bookeepz-server" "DB_CHARSET=utf8"
set_var "bookeepz-server" "SYSTEM_DB_NAME=bigcapital_system"
set_var "bookeepz-server" "TENANT_DB_NAME_PERFIX=bigcapital_tenant_"
set_var "bookeepz-server" 'REDIS_HOST=${{Redis.REDISHOST}}'
set_var "bookeepz-server" 'REDIS_PORT=${{Redis.REDISPORT}}'
set_var "bookeepz-server" 'REDIS_PASSWORD=${{Redis.REDISPASSWORD}}'
set_var "bookeepz-server" 'QUEUE_HOST=${{Redis.REDISHOST}}'
set_var "bookeepz-server" 'QUEUE_PORT=${{Redis.REDISPORT}}'
set_var "bookeepz-server" 'GOTENBERG_URL=http://${{gotenberg.RAILWAY_PRIVATE_DOMAIN}}:3000'
set_var "bookeepz-server" "SIGNUP_DISABLED=true"
set_var "bookeepz-server" "SIGNUP_EMAIL_CONFIRMATION=false"
set_var "bookeepz-server" "BANK_FEED_ENABLED=false"
set_var "bookeepz-server" "HOSTED_ON_BIGCAPITAL_CLOUD=false"

cat <<EOF
Bookeepz Railway configuration applied for environment: $ENVIRONMENT

Next:
1. Verify service names. If Railway created database names other than MySQL/Redis,
   rename them or update variable references in this script.
2. If services are not already linked to a GitHub repo, rerun with
   RAILWAY_SOURCE_REPO=<owner/repo> or configure source.repo in Railway.
3. Set sealed secrets from docs/railway.env.example.
4. Assign a Railway domain to bookeepz-webapp.
5. Set BASE_URL and GOTENBERG_DOCS_URL on bookeepz-server to that public domain.
6. Deploy and verify terminal SUCCESS before reporting go-live.
EOF
