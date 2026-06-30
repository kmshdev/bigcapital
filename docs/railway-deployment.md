# Bookeepz Railway Deployment

This repo uses a Railway-native split instead of lifting `docker-compose.prod.yml`
directly.

## Topology

| Service | Railway source | Public? | Purpose |
| --- | --- | --- | --- |
| `bookeepz-webapp` | repo Dockerfile `packages/webapp/Dockerfile.railway` | Yes | Serves the SPA with Nginx and proxies `/api` to the private server service. |
| `bookeepz-server` | repo Dockerfile `packages/server/Dockerfile` | No | Nest API on port `3000`. |
| `MySQL` | Railway managed database (`railway add --database mysql`) | No | System and tenant schemas. |
| `Redis` | Railway managed database (`railway add --database redis`) or verified `redis` template | No | Cache and queue backing service. |
| `gotenberg` | Gotenberg image/template | No | PDF rendering API. |

The browser calls relative `/api/...` routes. The public Nginx service keeps that
same-origin contract and forwards API requests over Railway private networking.

## Railway Primitive Selection

- MySQL: use Railway's managed database command. Template search currently does
  not return a verified MySQL template, while `railway add --database mysql` is
  documented by Railway and provisions the managed image, volume, and variables.
- Redis: use Railway's managed database command for consistency, or the verified
  `redis` template when the operator wants the template workflow.
- Gotenberg: no verified Railway template was available during review. Use the
  official public image `gotenberg/gotenberg:7` unless a project owner chooses a
  community template after inspecting it.
- Nginx: use the official `nginx:1.27-alpine` image as the runtime base in
  `packages/webapp/Dockerfile.railway`. Railway Nginx templates exist, but they
  are community templates and do not include Bookeepz's built SPA assets or API
  proxy contract.

## Apply Configuration

Run this after linking the target Railway project and environment:

```bash
railway environment link production
```

```bash
scripts/railway/apply-bookeepz-config.sh production
```

The script creates missing services, configures build sources, and sets
non-secret service variables. It does not deploy automatically.

## Required Secret Variables

Set these through Railway variables or the dashboard. Do not commit real values.

| Service | Variables |
| --- | --- |
| `bookeepz-server` | `APP_JWT_SECRET`, `JWT_SECRET`, optional mail/payment/S3/Plaid/LemonSqueezy keys |
| `bookeepz-webapp` | none by default |

The reusable template is in `docs/railway.env.example`.

## Migration And Bootstrap Order

1. Provision/configure services with `scripts/railway/apply-bookeepz-config.sh`.
2. Set required secrets.
3. Deploy `bookeepz-server` and wait for terminal `SUCCESS`.
4. Run system migrations from the server service:

   ```bash
   railway run --service bookeepz-server --environment production pnpm run system:migrate:latest
   ```

5. Deploy `bookeepz-webapp` and verify the public URL.
6. For local Bookeepz demo data, run bootstrap only with a temporary `.user.env`
   present inside the server runtime. Do not store bootstrap passwords as shared
   Railway variables unless the operator explicitly chooses that.

## Verification

Use terminal Railway deployment states before reporting success:

```bash
railway deployment list --service bookeepz-server --environment production --json
railway deployment list --service bookeepz-webapp --environment production --json
```

Then probe:

```bash
curl -fsS "https://<webapp-domain>/api/system_db"
curl -fsS "https://<webapp-domain>/"
```

## Deployment Invariants

- `bookeepz-webapp` is the only public browser entrypoint.
- `bookeepz-server` stays private and listens on port `3000`.
- `BASE_URL` and `GOTENBERG_DOCS_URL` must use the public webapp domain after
  the Railway domain is assigned.
- `TENANT_DB_NAME_PERFIX` must keep the existing misspelling.
- Queue and cache connections both use the managed Redis password.
- The Railway Nginx image entrypoint performs environment substitution for files
  under `/etc/nginx/templates`. `packages/webapp/Dockerfile.railway` restricts
  substitution to `PORT` and `BOOKEEPZ_SERVER_PRIVATE_HOST` so native Nginx
  variables such as `$host` and `$remote_addr` remain intact.
