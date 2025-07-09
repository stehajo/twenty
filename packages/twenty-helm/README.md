## Helm Chart Linting & Templating Caveats

- All Helm value interpolations in YAML (especially for environment variables and resource values) **must be wrapped in double quotes** to ensure valid YAML output.
- Avoid using dashes in Helm delimiters (`{{- ... -}}`) unless whitespace removal is explicitly required, as this can break YAML formatting.
- Use only spaces for indentation (no tabs) and ensure consistent indentation throughout all template files.
- If you encounter persistent YAML errors, try reducing the template to static YAML and reintroduce Helm expressions step by step, testing with `helm lint` after each change.
- File corruption or mixed indentation can cause YAML parse errors that are difficult to diagnose; rewriting the file with clean, consistent indentation can resolve these issues.

# Twenty Helm Chart

This Helm chart deploys the **Twenty CRM** application and its dependencies on Kubernetes. It supports flexible deployment scenarios, persistent storage, externalized services, and advanced configuration for production-ready environments.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Upgrade](#upgrade)
- [Uninstall](#uninstall)
- [Configuration](#configuration)
  - [Persistence and Storage](#persistence-and-storage)
  - [Database and Redis (Internal/External)](#database-and-redis-internalexternal)
  - [Ingress](#ingress)
  - [Secrets and Environment Variables](#secrets-and-environment-variables)
  - [Image Configuration](#image-configuration)
  - [Resource Requests and Limits](#resource-requests-and-limits)
  - [Pod Scheduling and Affinity](#pod-scheduling-and-affinity)
- [Usage Scenarios](#usage-scenarios)
- [Example values.yaml Files](#example-valuesyaml-files)
- [Best Practices & Caveats](#best-practices--caveats)
- [Migration from Docker Compose](#migration-from-docker-compose)
- [Further Reading](#further-reading)

---

## Features

- Deploys all core services: **server**, **worker**, **Postgres DB**, **Redis**
- Optionally use external managed Postgres and/or Redis
- Persistent storage for DB, server, and application data (Kubernetes PVC)
- Configurable ingress for HTTP/HTTPS
- Fine-grained resource and scheduling controls
- Environment-specific configuration via multiple values files

---

## Prerequisites

- Kubernetes 1.21+ cluster
- Helm 3.x
- Sufficient cluster resources for your chosen configuration
- (Optional) External Postgres/Redis endpoints if not using built-in services

---

## Installation

1. **Clone the repository** (or ensure you have the chart directory):

   ```sh
   git clone https://github.com/your-org/twenty.git
   cd twenty/packages/twenty-helm
   ```

2. **Install the chart** (using default values):

   ```sh
   helm install twenty ./ --namespace twentycrm --create-namespace
   ```

   - To customize, use `-f my-values.yaml` or see [Example values.yaml Files](#example-valuesyaml-files).

3. **Verify deployment:**

   ```sh
   kubectl get pods -n twentycrm
   kubectl get pvc -n twentycrm
   ```

---

## Upgrade

To upgrade an existing release (e.g., after changing values or updating the chart):

```sh
helm upgrade twenty ./ --namespace twentycrm -f values.yaml
```

- You can chain multiple `-f` flags for environment overrides (see [Environment-Specific Configuration](#usage-scenarios)).
- Always review the [Best Practices & Caveats](#best-practices--caveats) before upgrading, especially regarding persistence and secrets.

---

## Uninstall

To remove the release and all associated resources:

```sh
helm uninstall twenty --namespace twentycrm
```

- **Note:** PVCs are not deleted by default. Remove them manually if needed:

  ```sh
  kubectl delete pvc -n twentycrm --all
  ```

---

## Configuration

All configuration is managed via `values.yaml` and optional override files. Below are the main configuration blocks.

### Persistence and Storage

Configure persistent storage for the database, server, and application data (Kubernetes PVC):

```yaml
persistence:
  db:
    enabled: true
    storageClass: ""         # Set to your StorageClass, or leave empty for default
    accessModes:
      - ReadWriteOnce
    size: 8Gi
  server:
    enabled: true
    storageClass: ""
    accessModes:
      - ReadWriteOnce
    size: 8Gi
  kubeData:
    enabled: true
    storageClass: ""
    accessModes:
      - ReadWriteOnce
    size: 8Gi
```

- Set `enabled: true` to provision a PVC for the component.
- Adjust `storageClass`, `accessModes`, and `size` as needed.

### Database and Redis (Internal/External)

You can use the built-in Postgres/Redis or connect to external managed services.

```yaml
useExternalDb: false
externalDb:
  url: "postgres://user:password@host:5432/dbname"

useExternalRedis: false
externalRedis:
  url: "redis://host:6379"
```

- If `useExternalDb` is `true`, the chart will NOT deploy Postgres and will use `externalDb.url`.
- If `useExternalRedis` is `true`, the chart will NOT deploy Redis and will use `externalRedis.url`.

#### Example: Use Managed Postgres and Redis

```yaml
useExternalDb: true
externalDb:
  url: "postgres://admin:secret@cloud-db.example.com:5432/prod"
useExternalRedis: true
externalRedis:
  url: "rediss://cloud-redis.example.com:6379"
```

#### Example: Use Built-in Postgres and Redis

```yaml
useExternalDb: false
useExternalRedis: false
```

### Ingress

Expose the application via HTTP/HTTPS:

```yaml
ingress:
  enabled: true
  annotations: {}
  hosts:
    - host: crm.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    # - secretName: crm-tls
    #   hosts:
    #     - crm.example.com
```

- Set `enabled: true` to create an ingress resource.
- Add annotations for your ingress controller (e.g., nginx, cert-manager).
- Configure hosts and TLS as needed.

### Secrets and Environment Variables

Sensitive values and environment variables are set via these blocks:

```yaml
env:
  PGUSER_SUPERUSER: "postgres"
  PGPASSWORD_SUPERUSER: "postgres"
  SERVER_URL: "https://crm.example.com:443"
  REDIS_URL: "redis://twentycrm-redis.twentycrm.svc.cluster.local:6379"
  SIGN_IN_PREFILLED: "false"
  STORAGE_TYPE: "local"
  ACCESS_TOKEN_EXPIRES_IN: "7d"
  LOGIN_TOKEN_EXPIRES_IN: "1h"
  APP_SECRET: "accessToken"

secrets:
  tokens:
    APP_SECRET: "accessToken"
  NODE_PORT: "3000"
  DISABLE_DB_MIGRATIONS: "false"
```

- **Do NOT commit real secrets to version control.** Use external secret management (e.g., [Helm Secrets](https://github.com/jkroepke/helm-secrets), SOPS, or Kubernetes Secrets).

### Image Configuration

Set image repositories and tags for all components:

```yaml
image:
  repository: twentycrm/twenty
  tag: latest
  redisRepository: redis/redis-stack-server
  redisTag: latest
  dbRepository: twentycrm/twenty-postgres-spilo
  dbTag: latest
```

- Override tags to pin to specific versions for production.

### Resource Requests and Limits

Control resource allocation for each component:

```yaml
resources:
  db:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "1024Mi"
      cpu: "1000m"
  redis:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "1024Mi"
      cpu: "1000m"
  server:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "2048Mi"
      cpu: "2000m"
  worker:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "2048Mi"
      cpu: "2000m"
```

### Pod Scheduling and Affinity

Control pod placement with node selectors, tolerations, and affinity:

```yaml
scheduling:
  server:
    nodeSelector: {}
    tolerations: []
    affinity: {}
  worker:
    nodeSelector: {}
    tolerations: []
    affinity: {}
  db:
    nodeSelector: {}
    tolerations: []
    affinity: {}
  redis:
    nodeSelector: {}
    tolerations: []
    affinity: {}
```

- Only set these fields if non-empty to avoid YAML errors.

---

## Usage Scenarios

### All-in-One (All Services In-Cluster)

- Use default values.
- All services (server, worker, db, redis) are deployed in the cluster.

### Hybrid (Some Services External)

- Set `useExternalDb` or `useExternalRedis` to `true` as needed.
- Example: Use managed Postgres, in-cluster Redis.

### Minimal (Only App, All Dependencies External)

- Set both `useExternalDb` and `useExternalRedis` to `true`.
- Only the app server and worker are deployed.

---

## Example values.yaml Files

### Minimal Production Example

```yaml
useExternalDb: true
externalDb:
  url: "postgres://admin:prodsecret@prod-db.example.com:5432/prod"
useExternalRedis: true
externalRedis:
  url: "rediss://prod-redis.example.com:6379"
persistence:
  db:
    size: 64Gi
  server:
    size: 32Gi
ingress:
  enabled: true
  hosts:
    - host: crm.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - secretName: crm-tls
      hosts:
        - crm.example.com
```

### Full-Featured Example

```yaml
persistence:
  db:
    enabled: true
    storageClass: "fast-ssd"
    accessModes:
      - ReadWriteOnce
    size: 32Gi
  server:
    enabled: true
    storageClass: ""
    accessModes:
      - ReadWriteOnce
    size: 8Gi
  kubeData:
    enabled: false
    storageClass: ""
    accessModes:
      - ReadWriteOnce
    size: 8Gi

useExternalDb: false
useExternalRedis: false

image:
  repository: twentycrm/twenty
  tag: v1.2.3

resources:
  server:
    requests:
      memory: "1Gi"
      cpu: "1000m"
    limits:
      memory: "4Gi"
      cpu: "4000m"

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
  hosts:
    - host: crm.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - secretName: crm-tls
      hosts:
        - crm.example.com
```

---

## Best Practices & Caveats

- **Secrets:** Never commit real secrets to version control. Use external secret management tools.
- **Persistence:** If you disable persistence, all data will be lost on pod restarts. For production, always enable persistence for DB and server.
- **Upgrades:** Review breaking changes in new chart versions. Always back up your data before upgrading.
- **Environment-Specific Values:** Use base + override files for dev/staging/prod. Only override what’s different.
- **Ingress:** Ensure your ingress controller is installed and configured. Set correct annotations for SSL/TLS.
- **Pod Scheduling:** Only set `nodeSelector`, `tolerations`, or `affinity` if non-empty to avoid YAML errors.
- **Resource Requests:** Tune resource requests/limits for your workload and cluster size.
- **Testing:** After install/upgrade, verify PVCs are bound and pods are running as expected.

---

## Further Reading

- [Helm: Using Helm with Different Environments](https://helm.sh/docs/chart_best_practices/values/#using-helm-with-different-environments)
- [Helm: Chart Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Helm Secrets](https://github.com/jkroepke/helm-secrets)

---

## Migration from Docker Compose

If you are migrating from a Docker Compose setup to this Helm chart for Kubernetes, please note the following changes:

- The persistent volume previously referred to as `dockerData` is now named `kubeData` throughout the chart, values files, and documentation.
- The PVC template file has been renamed from `pvc-docker-data.yaml` to `pvc-kube-data.yaml`, and the resource name is now `twentycrm-kube-data-pvc`.
- All configuration and comments now refer to "application data (Kubernetes PVC)" instead of "Docker data" to clarify the purpose in a Kubernetes context.
- When migrating, ensure you update any custom values files or scripts to use the new `kubeData` key and resource names.
- The chart is designed for Kubernetes best practices and may differ from Docker Compose in storage provisioning, resource management, and networking.

For further details, review the [Persistence and Storage](#persistence-and-storage) section and the example values files.

---

## Troubleshooting

### Common Issues & Solutions

- **YAML parse errors:**
  - *Symptoms:* `Error: YAML parse error` or Helm fails to render templates.
  - *Causes:* Mixed indentation (tabs vs spaces), missing quotes around Helm expressions, or trailing whitespace.
  - *Solution:*
    - Always use spaces, never tabs.
    - Wrap all Helm value interpolations in double quotes (`"{{ .Values.foo }}"`).
    - If stuck, reduce your template to static YAML and reintroduce Helm expressions step by step, running `helm lint` after each change.

- **Pods stuck in Pending or CrashLoopBackOff:**
  - *Symptoms:* `kubectl get pods` shows pods not running.
  - *Causes:* Insufficient resources, unbound PVCs, or misconfigured environment variables.
  - *Solution:*
    - Check resource requests/limits in your values file.
    - Ensure your cluster has enough resources and storage classes are correct.
    - Run `kubectl describe pod <pod-name>` for more details.

- **PersistentVolumeClaim (PVC) not bound:**
  - *Symptoms:* PVCs remain in Pending state.
  - *Causes:* No matching StorageClass, or insufficient storage.
  - *Solution:*
    - Set the correct `storageClass` in your values file.
    - Check available storage classes with `kubectl get storageclass`.

- **Ingress not working:**
  - *Symptoms:* No external access, 404 errors, or SSL issues.
  - *Causes:* Ingress controller not installed, missing annotations, or DNS misconfiguration.
  - *Solution:*
    - Ensure an ingress controller (e.g., nginx) is installed.
    - Set required annotations in `ingress.annotations`.
    - Check DNS records and TLS secret names.

- **External DB/Redis not connecting:**
  - *Symptoms:* App cannot connect to external services.
  - *Causes:* Incorrect connection strings, network policies, or firewall rules.
  - *Solution:*
    - Double-check `externalDb.url` and `externalRedis.url`.
    - Ensure services are accessible from your cluster.

- **Secrets accidentally committed:**
  - *Symptoms:* Sensitive values appear in version control.
  - *Solution:*
    - Rotate secrets immediately.
    - Use external secret management (Helm Secrets, SOPS, or Kubernetes Secrets).

---

## Practical Examples

### Minimal Stateless Deployment

```yaml
# values-minimal.yaml
namespace: twentycrm
persistence:
  db:
    enabled: false
  server:
    enabled: false
  kubeData:
    enabled: false
ingress:
  enabled: false
useExternalDb: false
useExternalRedis: false
env:
  SERVER_URL: "https://crm.example.com:443"
  APP_SECRET: "accessToken"
```

### Production with External DB/Redis

```yaml
useExternalDb: true
externalDb:
  url: "postgres://admin:prodsecret@prod-db.example.com:5432/prod"
useExternalRedis: true
externalRedis:
  url: "rediss://prod-redis.example.com:6379"
persistence:
  db:
    enabled: false
  server:
    enabled: true
    size: 32Gi
ingress:
  enabled: true
  hosts:
    - host: crm.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - secretName: crm-tls
      hosts:
        - crm.example.com
```

### Enabling Ingress with SSL

```yaml
ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
  hosts:
    - host: crm.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - secretName: crm-tls
      hosts:
        - crm.example.com
```

---

## Common Pitfalls & Best Practices

- **Never commit real secrets** to version control. Use external secret management tools.
- **Always enable persistence** for DB and server in production. Disabling persistence will cause data loss on pod restarts.
- **Pin image tags** for production deployments. Avoid using `latest` in production.
- **Wrap all Helm value interpolations in double quotes** in your templates to avoid YAML errors.
- **Use only spaces for indentation** in YAML files. Never use tabs.
- **Set scheduling fields only if needed.** Leave `nodeSelector`, `tolerations`, and `affinity` empty unless you have specific requirements.
- **After install/upgrade, always verify** that PVCs are bound and pods are running as expected.
- **For external DB/Redis, ensure network access** from your cluster to those services.
- **Review breaking changes** in new chart versions before upgrading.
- **Use environment-specific values files** for dev/staging/prod, overriding only what’s different.

---

## Further Reading

- [Helm: Using Helm with Different Environments](https://helm.sh/docs/chart_best_practices/values/#using-helm-with-different-environments)
- [Helm: Chart Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Helm Secrets](https://github.com/jkroepke/helm-secrets)

---

## Support

For issues or questions, please open an issue in the repository or contact the maintainers.
