# Production Deployment Guide

<!-- Last Updated: 2025-07-17 -->

This guide will help you deploy the Hotel Voice Bot to production with comprehensive monitoring, alerting, and logging.

## Prerequisites

- EKS cluster running
- kubectl configured for your cluster
- Helm installed
- AWS CLI configured with appropriate permissions
- Domain name configured with SSL certificate

## Step 1: Set up secrets

- [ ] Base64 encode your secrets:

```bash
echo -n "your-sentry-dsn" | base64
echo -n "your-openai-key" | base64
echo -n "your-whatsapp-token" | base64
echo -n "your-supabase-url" | base64
echo -n "your-supabase-key" | base64
echo -n "your-pagerduty-integration-key" | base64
```

- [ ] Update the `deploy/k8s/secret.yml` file with your base64-encoded values.

## Step 2: Update configuration

- [ ] Update `deploy/k8s/ingress.yml`:
   - Replace `ACCOUNT_ID` with your AWS account ID
   - Replace `CERT_ID` with your SSL certificate ID
   - Replace `WAF_ID` with your WAF web ACL ID
   - Update domain names to match your setup

- [ ] Update `deploy/k8s/deployment.yml`:
   - Replace `your-registry/hotel-voice-bot:latest` with your actual image URI

## Step 3: Deploy the application

```bash
# Create namespace and deploy app
kubectl apply -f deploy/k8s/namespace.yml
kubectl apply -f deploy/k8s/configmap.yml
kubectl apply -f deploy/k8s/secret.yml
kubectl apply -f deploy/k8s/deployment.yml
kubectl apply -f deploy/k8s/service.yml
kubectl apply -f deploy/k8s/hpa.yml
kubectl apply -f deploy/k8s/ingress.yml
```

## Step 4: Deploy monitoring stack

```bash
# Create monitoring namespace
kubectl apply -f deploy/monitoring/namespace.yml

# Deploy Prometheus
kubectl apply -f deploy/monitoring/prometheus-config.yml
kubectl apply -f deploy/monitoring/prometheus-deployment.yml

# Deploy Grafana
kubectl apply -f deploy/monitoring/grafana-deployment.yml
kubectl apply -f deploy/monitoring/grafana-dashboard.yml

# Deploy Loki for log aggregation
kubectl apply -f deploy/monitoring/loki-deployment.yml
kubectl apply -f deploy/monitoring/promtail-daemonset.yml

# Deploy AlertManager
kubectl apply -f deploy/monitoring/alertmanager-deployment.yml
```

## Step 5: Configure services

- [ ] **Prometheus**: Access at `http://prometheus-service:9090`
- [ ] **Grafana**: Access at `http://grafana-service:3000` (admin/admin123)
- [ ] **AlertManager**: Access at `http://alertmanager-service:9093`

## Step 6: Set up PagerDuty

- [ ] Create a PagerDuty service
- [ ] Get the integration key
- [ ] Update the `PAGERDUTY_INTEGRATION_KEY` in your secrets
- [ ] Update `deploy/monitoring/alertmanager-deployment.yml` with your PagerDuty configuration

## Step 7: Configure Sentry

- [ ] Create a Sentry project
- [ ] Get the DSN
- [ ] Update the `SENTRY_DSN` in your secrets

## Step 8: Set up WAF

Create a WAF web ACL with the following rules:

- Rate limiting (100 requests per 5 minutes per IP)
- Geographic blocking (if needed)
- IP allowlist/blocklist
- SQL injection protection
- XSS protection

## Step 9: Verify deployment

```bash
# Check application pods
kubectl get pods -n hotel-voice-bot

# Check monitoring pods
kubectl get pods -n monitoring

# Check services
kubectl get svc -n hotel-voice-bot
kubectl get svc -n monitoring

# Check ingress
kubectl get ingress -n hotel-voice-bot
```

## Step 10: Test monitoring and alerting

- [ ] **Check Prometheus targets**: Verify all targets are up
- [ ] **View Grafana dashboards**: Check metrics are being collected
- [ ] **Test alerts**: Trigger a test alert to verify PagerDuty integration
- [ ] **Check logs**: Verify logs are being collected by Loki

## Monitoring Features

### Metrics Collected

- HTTP request rate and latency
- Error rates (4xx, 5xx)
- CPU and memory usage
- Pod restart counts
- Custom application metrics

### Alerts Configured

- Application down (critical)
- High error rate (warning)
- High latency (warning)
- High CPU/memory usage (warning)
- Pod crash looping (critical)

### Dashboards

- Application performance dashboard
- Infrastructure monitoring
- Error tracking
- Log analysis

## Scaling Configuration

- **HPA**: Scales 3-10 pods based on CPU (70%), memory (80%), and request rate (50 RPS)
- **Cluster Autoscaler**: Automatically scales nodes based on demand
- **Vertical Pod Autoscaler**: Adjusts resource requests/limits

## Security Features

- **Network Policies**: Restrict pod-to-pod communication
- **Pod Security Standards**: Enforce security contexts
- **Secrets Management**: All sensitive data in Kubernetes secrets
- **WAF Protection**: Web Application Firewall rules
- **TLS Termination**: HTTPS with valid certificates

## Maintenance

- [ ] **Regular Updates**: Keep images and dependencies updated
- [ ] **Backup**: Regular backups of metrics and logs
- [ ] **Monitoring**: Monitor resource usage and scale accordingly
- [ ] **Security**: Regular security scans and updates

## Troubleshooting

- **Logs**: `kubectl logs -n hotel-voice-bot -l app=hotel-voice-bot`
- **Events**: `kubectl get events -n hotel-voice-bot`
- **Metrics**: Check Prometheus and Grafana for performance issues
- **Alerts**: Review AlertManager for any firing alerts

## Alternative: Fly.io Deployment

For simpler deployment, you can use Fly.io:

```bash
# Deploy to Fly.io
fly deploy

# Check status
fly status

# View logs
fly logs
```

The `fly.toml` configuration is already set up with health checks and auto-scaling.

## Known Issues/Caveats

*Document any known issues, edge cases, or operational caveats discovered during production deployment. For new issues, please create a [Known Issues ticket](.github/ISSUE_TEMPLATE/known_issues.md) and reference it here.*

<!-- Example:
### Issue: EKS Cluster Autoscaler Conflicts with HPA
- **Severity**: Medium
- **Workaround**: Set HPA max replicas to align with cluster capacity
- **Reference**: [Known Issue #101](https://github.com/your-org/hotel-voice-bot/issues/101)
-->
