# Hotel Voice Bot Deployment Runbook

<!-- Last Updated: 2025-07-17 -->

## Overview

This runbook provides step-by-step instructions for deploying the Hotel Voice Bot to production environments.

## Prerequisites

- [ ] Access to deployment environment (AWS ECS, Fly.io, or Kubernetes)
- [ ] Environment variables configured and validated
- [ ] Database migration scripts tested
- [ ] WAHA (WhatsApp HTTP API) instance configured
- [ ] Supabase project configured with proper RLS policies
- [ ] OpenAI API key with sufficient credits
- [ ] Monitoring and alerting systems configured

## Pre-Deployment Checklist

### 1. Code Review and Testing

- [ ] All tests passing in CI/CD pipeline
- [ ] Code review completed and approved
- [ ] Security scan completed (no high/critical vulnerabilities)
- [ ] Performance testing completed
- [ ] Load testing completed for expected traffic

### 2. Environment Configuration

- [ ] Production environment variables validated
- [ ] Database connection strings tested
- [ ] API keys and secrets properly configured
- [ ] SSL certificates valid and configured
- [ ] CDN configuration updated (if applicable)

### 3. Database Preparation

- [ ] Database backup created
- [ ] Migration scripts validated in staging
- [ ] Database performance metrics baseline established
- [ ] RLS policies tested and validated

### 4. External Dependencies

- [ ] WhatsApp Business API verified
- [ ] WAHA instance healthy and reachable
- [ ] OpenAI API accessible and rate limits confirmed
- [ ] Supabase instance healthy and accessible
- [ ] PMS integration endpoints verified

## Deployment Steps

### Step 1: Database Migration

1. **Create Database Backup**

   ```bash
   # For Supabase
   supabase db dump --role=postgres > backup-$(date +%Y%m%d-%H%M%S).sql

   # For PostgreSQL
   pg_dump -h localhost -U postgres hotel_voice_bot > backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Run Migration Scripts**

   ```bash
   # Apply bot tables migration
   psql -h [HOST] -U [USER] -d [DATABASE] -f packages/scripts/migrations/001_add_bot_tables.sql
   ```

## Or using Supabase CLI

   ```bash
   supabase db push
   ```

3. **Verify Migration**

   ```bash
   # Check tables exist
   psql -h [HOST] -U [USER] -d [DATABASE] -c "\dt public.bot_*"

   # Check indexes
   psql -h [HOST] -U [USER] -d [DATABASE] -c "\di public.idx_bot_*"
   ```

### Step 2: Application Deployment

#### Option A: AWS ECS Deployment

1. **Build and Push Container**

   ```bash
   # Build Docker image
   docker build -t hotel-voice-bot:latest .

   # Tag for ECR
   docker tag hotel-voice-bot:latest [ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com/hotel-voice-bot:latest

   # Push to ECR
   docker push [ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com/hotel-voice-bot:latest
   ```

2. **Update ECS Service**

   ```bash
   # Update task definition
   aws ecs register-task-definition --cli-input-json file://task-definition.json

   # Update service
   aws ecs update-service --cluster hotel-voice-bot --service hotel-voice-bot-service --task-definition hotel-voice-bot:LATEST
   ```

3. **Monitor Deployment**

   ```bash
   # Check deployment status
   aws ecs describe-services --cluster hotel-voice-bot --services hotel-voice-bot-service

   # Check task health
   aws ecs describe-tasks --cluster hotel-voice-bot --tasks [TASK_ARN]
   ```

#### Option B: Fly.io Deployment

1. **Deploy Application**

   ```bash
   # Deploy to Fly.io
   fly deploy

   # Monitor deployment
   fly status
   ```

2. **Check Logs**
   ```bash
   # View application logs
   fly logs
   ```

#### Option C: Kubernetes Deployment

1. **Apply Kubernetes Manifests**

   ```bash
   # Apply namespace
   kubectl apply -f deploy/k8s/namespace.yml

   # Apply configmaps and secrets
   kubectl apply -f deploy/k8s/configmap.yml
   kubectl apply -f deploy/k8s/secret.yml

   # Apply deployment
   kubectl apply -f deploy/k8s/deployment.yml

   # Apply service and ingress
   kubectl apply -f deploy/k8s/service.yml
   kubectl apply -f deploy/k8s/ingress.yml
   ```

2. **Monitor Deployment**

   ```bash
   # Check deployment status
   kubectl get deployments -n hotel-voice-bot

   # Check pod status
   kubectl get pods -n hotel-voice-bot

   # Check service
   kubectl get svc -n hotel-voice-bot
   ```

### Step 3: Post-Deployment Verification

1. **Health Check**

   ```bash
   # Check application health
   curl -f https://your-domain.com/api/health

   # Expected response:
   # {"status":"ok","timestamp":"2024-01-15T10:30:00Z","uptime":30}
   ```

2. **API Endpoint Tests**

   ```bash
   # Test WhatsApp webhook endpoint
   curl -X GET "https://your-domain.com/api/whatsapp/webhook?token=your-token"

   # Test FAQ endpoint
   curl -X GET "https://your-domain.com/api/faqs?language=en"
   ```

3. **Database Connectivity**

   ```bash
   # Test database connection
   psql -h [HOST] -U [USER] -d [DATABASE] -c "SELECT COUNT(*) FROM public.faqs;"
   ```

4. **External Service Integration**

   ```bash
   # Test OpenAI API
   curl -X POST "https://api.openai.com/v1/chat/completions" \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}'

   # Test WAHA API
   curl -X GET "$WAHA_API_URL/api/sessions" \
     -H "X-API-Key: $WAHA_API_KEY"
   ```

### Step 4: Monitoring and Alerting

1. **Configure Monitoring**

   ```bash
   # Deploy monitoring stack (if using Kubernetes)
   kubectl apply -f deploy/monitoring/
   ```

2. **Set Up Alerts**
   - Application health alerts
   - Database connection alerts
   - API response time alerts
   - Error rate alerts
   - WhatsApp webhook failure alerts

3. **Verify Monitoring**
   - Check Grafana dashboards
   - Verify Prometheus metrics
   - Test alert notifications

### Step 5: Final Verification

1. **End-to-End Testing**
   - Send a test WhatsApp message
   - Verify bot response
   - Check message logging in database
   - Test escalation flow

2. **Performance Verification**
   - Check response times
   - Verify memory usage
   - Check CPU utilization
   - Verify database query performance

3. **Security Verification**
   - SSL certificate valid
   - API endpoints properly secured
   - Database connections encrypted
   - Sensitive data properly masked in logs

## Post-Deployment Tasks

1. **Documentation Updates**
   - Update deployment documentation
   - Update API documentation
   - Update monitoring runbooks

2. **Team Notification**
   - Notify stakeholders of successful deployment
   - Share deployment notes and changes
   - Schedule post-deployment review

3. **Monitoring Setup**
   - Set up 24/7 monitoring
   - Configure on-call rotation
   - Create incident response procedures

## Troubleshooting Common Issues

### Issue: Database Connection Failures

```bash
# Check connection string
echo $DATABASE_URL

# Test connection manually
psql "$DATABASE_URL" -c "SELECT 1;"

# Check RLS policies
psql "$DATABASE_URL" -c "SELECT * FROM pg_policies WHERE tablename LIKE 'bot_%';"
```

### Issue: WhatsApp Integration Not Working

```bash
# Check WAHA service status
curl -X GET "$WAHA_API_URL/api/sessions" -H "X-API-Key: $WAHA_API_KEY"

# Check webhook configuration
curl -X GET "$WAHA_API_URL/api/webhooks" -H "X-API-Key: $WAHA_API_KEY"

# Test webhook endpoint
curl -X GET "https://your-domain.com/api/whatsapp/webhook?token=$WAHA_WEBHOOK_TOKEN"
```

### Issue: OpenAI API Errors

```bash
# Check API key validity
curl -X GET "https://api.openai.com/v1/models" \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check rate limits
curl -X POST "https://api.openai.com/v1/chat/completions" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Test"}],"max_tokens":1}' \
  -i
```

## Rollback Procedures

If deployment fails or issues are discovered:

1. **Immediate Rollback**

   ```bash
   # For ECS
   aws ecs update-service --cluster hotel-voice-bot --service hotel-voice-bot-service --task-definition hotel-voice-bot:[PREVIOUS_REVISION]

   # For Kubernetes
   kubectl rollout undo deployment/hotel-voice-bot -n hotel-voice-bot

   # For Fly.io
   fly releases
   fly rollback [RELEASE_ID]
   ```

2. **Database Rollback** (if necessary)

   ```bash
   # Restore from backup
   psql -h [HOST] -U [USER] -d [DATABASE] < backup-[TIMESTAMP].sql
   ```

3. **Verify Rollback**
   - Check application health
   - Verify database integrity
   - Test critical functionality

## Contact Information

- **DevOps Team**: devops@yourcompany.com
- **On-Call Engineer**: +1-xxx-xxx-xxxx
- **Project Manager**: pm@yourcompany.com
- **Technical Lead**: tech-lead@yourcompany.com

## Related Docs

- [**Rollback Runbook**](./rollback.md) - Use this when deployment fails or issues are detected
- [**Hot-patch Runbook**](./hot-patch.md) - Use this for emergency fixes without full deployment

## Known Issues/Caveats

*Document any known issues, edge cases, or operational caveats discovered during deployment. For new issues, please create a [Known Issues ticket](.github/ISSUE_TEMPLATE/known_issues.md) and reference it here.*

<!-- Example:
### Issue: Database Connection Timeout During Peak Traffic
- **Severity**: Medium
- **Workaround**: Increase connection pool size in deployment config
- **Reference**: [Known Issue #123](https://github.com/your-org/hotel-voice-bot/issues/123)
-->

## References

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Fly.io Documentation](https://fly.io/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [WAHA Documentation](https://waha.devlike.pro/)
