# Hotel Voice Bot Rollback Runbook

<!-- Last Updated: 2025-07-17 -->

## Overview

This runbook provides step-by-step instructions for rolling back the Hotel Voice Bot deployment in case of issues or failures.

## When to Rollback

Rollback should be initiated when:

- Critical application functionality is broken
- Database corruption or data loss is detected
- Security vulnerabilities are discovered
- Performance degradation affects user experience
- External integrations are failing consistently
- High error rates are observed (>5% for more than 10 minutes)

## Rollback Decision Matrix

| Issue Severity | Response Time | Action                           |
| -------------- | ------------- | -------------------------------- |
| Critical (P0)  | Immediate     | Full rollback                    |
| High (P1)      | 15 minutes    | Rollback if hotfix not available |
| Medium (P2)    | 1 hour        | Evaluate rollback vs. hotfix     |
| Low (P3)       | 4 hours       | Plan for next deployment         |

## Pre-Rollback Checklist

- [ ] Incident commander assigned
- [ ] Rollback decision approved by technical lead
- [ ] Communication sent to stakeholders
- [ ] Database backup verified
- [ ] Previous stable version identified
- [ ] Rollback team assembled

## Rollback Procedures

### Step 1: Immediate Assessment

1. **Identify the Issue**

   ```bash
   # Check application logs
   kubectl logs -n hotel-voice-bot deployment/hotel-voice-bot --tail=100

   # Check error metrics
   curl -X GET "https://your-monitoring-endpoint/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])"
   ```

2. **Determine Rollback Scope**
   - Application only
   - Database and application
   - Configuration changes
   - Infrastructure changes

### Step 2: Application Rollback

#### Option A: AWS ECS Rollback

1. **List Previous Task Definitions**

   ```bash
   # List task definitions
   aws ecs list-task-definitions --family-prefix hotel-voice-bot --status ACTIVE

   # Get previous revision
   aws ecs describe-task-definition --task-definition hotel-voice-bot:[PREVIOUS_REVISION]
   ```

2. **Rollback to Previous Version**

   ```bash
   # Update service to previous task definition
   aws ecs update-service \
     --cluster hotel-voice-bot \
     --service hotel-voice-bot-service \
     --task-definition hotel-voice-bot:[PREVIOUS_REVISION]
   ```

3. **Monitor Rollback**

   ```bash
   # Check service status
   aws ecs describe-services \
     --cluster hotel-voice-bot \
     --services hotel-voice-bot-service

   # Wait for stable state
   aws ecs wait services-stable \
     --cluster hotel-voice-bot \
     --services hotel-voice-bot-service
   ```

#### Option B: Kubernetes Rollback

1. **Check Rollout History**

   ```bash
   # View rollout history
   kubectl rollout history deployment/hotel-voice-bot -n hotel-voice-bot

   # Check specific revision
   kubectl rollout history deployment/hotel-voice-bot -n hotel-voice-bot --revision=2
   ```

2. **Rollback to Previous Version**

   ```bash
   # Rollback to previous revision
   kubectl rollout undo deployment/hotel-voice-bot -n hotel-voice-bot

   # Or rollback to specific revision
   kubectl rollout undo deployment/hotel-voice-bot -n hotel-voice-bot --to-revision=2
   ```

3. **Monitor Rollback**

   ```bash
   # Check rollout status
   kubectl rollout status deployment/hotel-voice-bot -n hotel-voice-bot

   # Check pods
   kubectl get pods -n hotel-voice-bot -l app=hotel-voice-bot
   ```

#### Option C: Fly.io Rollback

1. **List Previous Releases**

   ```bash
   # List releases
   fly releases

   # Get release details
   fly releases --json | jq '.[] | select(.status == "succeeded") | {version, created_at}'
   ```

2. **Rollback to Previous Release**

   ```bash
   # Rollback to specific release
   fly rollback [RELEASE_ID]

   # Or rollback to previous release
   fly rollback
   ```

3. **Monitor Rollback**

   ```bash
   # Check application status
   fly status

   # Check logs
   fly logs
   ```

### Step 3: Database Rollback (if required)

⚠️ **WARNING**: Database rollback should only be performed if data corruption is confirmed and recent backup is available.

1. **Stop Application Traffic**

   ```bash
   # Scale down to zero instances
   kubectl scale deployment hotel-voice-bot --replicas=0 -n hotel-voice-bot

   # Or for ECS
   aws ecs update-service --cluster hotel-voice-bot --service hotel-voice-bot-service --desired-count 0
   ```

2. **Create Current Database Backup**

   ```bash
   # Create backup before rollback
   pg_dump -h [HOST] -U [USER] -d [DATABASE] > rollback-backup-$(date +%Y%m%d-%H%M%S).sql

   # Or for Supabase
   supabase db dump --role=postgres > rollback-backup-$(date +%Y%m%d-%H%M%S).sql
   ```

3. **Restore from Backup**

   ```bash
   # Restore from backup (DESTRUCTIVE OPERATION)
   psql -h [HOST] -U [USER] -d [DATABASE] < backup-[TIMESTAMP].sql

   # Verify restoration
   psql -h [HOST] -U [USER] -d [DATABASE] -c "SELECT COUNT(*) FROM public.bot_messages;"
   ```

4. **Restart Application**

   ```bash
   # Scale back up
   kubectl scale deployment hotel-voice-bot --replicas=3 -n hotel-voice-bot

   # Or for ECS
   aws ecs update-service --cluster hotel-voice-bot --service hotel-voice-bot-service --desired-count 3
   ```

### Step 4: Configuration Rollback

1. **Environment Variables**

   ```bash
   # For Kubernetes
   kubectl get configmap hotel-voice-bot-config -n hotel-voice-bot -o yaml > current-config.yaml
   kubectl apply -f previous-config.yaml

   # For ECS
   aws ecs describe-task-definition --task-definition hotel-voice-bot:[PREVIOUS_REVISION] \
     --query 'taskDefinition.containerDefinitions[0].environment'
   ```

2. **Secrets**
   ```bash
   # For Kubernetes
   kubectl get secret hotel-voice-bot-secrets -n hotel-voice-bot -o yaml > current-secrets.yaml
   kubectl apply -f previous-secrets.yaml
   ```

### Step 5: External Service Configuration

1. **WhatsApp Webhook**

   ```bash
   # Update webhook URL to previous version
   curl -X POST "$WAHA_API_URL/api/webhooks" \
     -H "X-API-Key: $WAHA_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://previous-version.yourdomain.com/api/whatsapp/webhook",
       "events": ["message"]
     }'
   ```

2. **Load Balancer Configuration**
   ```bash
   # Update target group to previous version
   aws elbv2 modify-target-group \
     --target-group-arn [ARN] \
     --health-check-path /api/health
   ```

## Post-Rollback Verification

### Step 1: Health Checks

1. **Application Health**

   ```bash
   # Check health endpoint
   curl -f https://your-domain.com/api/health

   # Check response time
   curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/health
   ```

2. **Database Connectivity**

   ```bash
   # Test database connection
   psql -h [HOST] -U [USER] -d [DATABASE] -c "SELECT 1;"

   # Check table integrity
   psql -h [HOST] -U [USER] -d [DATABASE] -c "SELECT COUNT(*) FROM public.bot_messages;"
   ```

3. **External Services**

   ```bash
   # Test OpenAI API
   curl -X POST "https://api.openai.com/v1/chat/completions" \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4","messages":[{"role":"user","content":"Test"}],"max_tokens":1}'

   # Test WAHA API
   curl -X GET "$WAHA_API_URL/api/sessions" \
     -H "X-API-Key: $WAHA_API_KEY"
   ```

### Step 2: Functional Testing

1. **WhatsApp Integration**

   ```bash
   # Send test message to webhook
   curl -X POST "https://your-domain.com/api/whatsapp/webhook?token=$WAHA_WEBHOOK_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "1234567890",
       "to": "0987654321",
       "body": "Test message",
       "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
       "messageId": "test-123",
       "type": "text"
     }'
   ```

2. **FAQ Retrieval**

   ```bash
   # Test FAQ endpoint
   curl -X GET "https://your-domain.com/api/faqs?language=en&limit=5"
   ```

3. **Conversation Flow**
   ```bash
   # Test conversation creation
   curl -X POST "https://your-domain.com/api/conversations" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $API_TOKEN" \
     -d '{
       "phoneNumber": "1234567890",
       "hotelInfo": {
         "id": "hotel-123",
         "name": "Test Hotel",
         "location": "Test City"
       }
     }'
   ```

### Step 3: Performance Verification

1. **Response Times**

   ```bash
   # Check API response times
   for i in {1..10}; do
     curl -w "%{time_total}\n" -o /dev/null -s https://your-domain.com/api/health
   done
   ```

2. **Memory and CPU Usage**

   ```bash
   # For Kubernetes
   kubectl top pods -n hotel-voice-bot

   # For ECS
   aws ecs describe-tasks --cluster hotel-voice-bot --tasks [TASK_ARN] \
     --query 'tasks[0].containers[0].{CPU:cpu,Memory:memory}'
   ```

3. **Database Performance**
   ```bash
   # Check slow queries
   psql -h [HOST] -U [USER] -d [DATABASE] -c "
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   WHERE mean_time > 100
   ORDER BY mean_time DESC
   LIMIT 10;"
   ```

## Rollback Completion

### Step 1: Documentation

1. **Update Incident Report**
   - Document rollback actions taken
   - Record timeline of events
   - Note any data loss or service impact

2. **Update Runbooks**
   - Document lessons learned
   - Update rollback procedures if needed
   - Note any automation opportunities

### Step 2: Communication

1. **Notify Stakeholders**

   ```
   Subject: Hotel Voice Bot Rollback Completed

   The Hotel Voice Bot has been successfully rolled back to version [VERSION].

   Rollback completed at: [TIMESTAMP]
   Service restored at: [TIMESTAMP]
   Total downtime: [DURATION]

   Current status: All services operational
   Next steps: Root cause analysis and fix development
   ```

2. **Update Status Page**
   - Update incident status
   - Provide timeline of events
   - Confirm service restoration

### Step 3: Post-Rollback Actions

1. **Monitor Stability**
   - Watch application metrics for 2 hours
   - Monitor error rates and response times
   - Check for any unexpected issues

2. **Schedule Post-Incident Review**
   - Schedule within 24 hours
   - Include all stakeholders
   - Review rollback effectiveness

3. **Plan Forward Fix**
   - Identify root cause
   - Develop proper fix
   - Plan next deployment strategy

## Emergency Contacts

- **Incident Commander**: +1-xxx-xxx-xxxx
- **Technical Lead**: tech-lead@yourcompany.com
- **DevOps Team**: devops@yourcompany.com
- **Database Administrator**: dba@yourcompany.com
- **Security Team**: security@yourcompany.com

## Common Rollback Scenarios

### Scenario 1: High Error Rate

```bash
# Check error rate
curl -X GET "https://your-monitoring-endpoint/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])"

# If error rate > 5%, initiate rollback
if [ $(curl -s "https://your-monitoring-endpoint/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq '.data.result[0].value[1] | tonumber') -gt 0.05 ]; then
    echo "High error rate detected, initiating rollback"
    kubectl rollout undo deployment/hotel-voice-bot -n hotel-voice-bot
fi
```

### Scenario 2: Database Migration Failure

```bash
# Check migration status
psql -h [HOST] -U [USER] -d [DATABASE] -c "SELECT * FROM public.bot_messages LIMIT 1;"

# If migration failed, rollback database
if [ $? -ne 0 ]; then
    echo "Database migration failed, initiating database rollback"
    kubectl scale deployment hotel-voice-bot --replicas=0 -n hotel-voice-bot
    psql -h [HOST] -U [USER] -d [DATABASE] < backup-[TIMESTAMP].sql
    kubectl scale deployment hotel-voice-bot --replicas=3 -n hotel-voice-bot
fi
```

### Scenario 3: External Service Integration Failure

```bash
# Check OpenAI API connectivity
if ! curl -s -f -X GET "https://api.openai.com/v1/models" -H "Authorization: Bearer $OPENAI_API_KEY" > /dev/null; then
    echo "OpenAI API connectivity failed, check configuration"
    # Rollback to previous configuration
    kubectl apply -f previous-config.yaml
fi

# Check WAHA API connectivity
if ! curl -s -f -X GET "$WAHA_API_URL/api/sessions" -H "X-API-Key: $WAHA_API_KEY" > /dev/null; then
    echo "WAHA API connectivity failed, check configuration"
    # Update webhook URL to previous version
    curl -X POST "$WAHA_API_URL/api/webhooks" \
      -H "X-API-Key: $WAHA_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"url": "https://previous-version.yourdomain.com/api/whatsapp/webhook"}'
fi
```

## Automation Scripts

### Automated Rollback Script

```bash
#!/bin/bash
# automated-rollback.sh

set -e

NAMESPACE="hotel-voice-bot"
DEPLOYMENT="hotel-voice-bot"
HEALTH_ENDPOINT="https://your-domain.com/api/health"

echo "Starting automated rollback..."

# Check if rollback is needed
if curl -s -f "$HEALTH_ENDPOINT" > /dev/null; then
    echo "Application is healthy, no rollback needed"
    exit 0
fi

echo "Application unhealthy, initiating rollback..."

# Rollback deployment
kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE

# Wait for rollback to complete
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=300s

# Verify health
sleep 30
if curl -s -f "$HEALTH_ENDPOINT" > /dev/null; then
    echo "Rollback successful, application is healthy"
else
    echo "Rollback failed, application still unhealthy"
    exit 1
fi
```

## Related Docs

- [**Deployment Runbook**](./deployment.md) - Use this for planning and executing new deployments
- [**Hot-patch Runbook**](./hot-patch.md) - Use this for emergency fixes that don't require full rollback

## Known Issues/Caveats

*Document any known issues, edge cases, or operational caveats discovered during rollback operations. For new issues, please create a [Known Issues ticket](.github/ISSUE_TEMPLATE/known_issues.md) and reference it here.*

<!-- Example:
### Issue: Rollback Fails When Database Migration Contains Non-Reversible Changes
- **Severity**: High
- **Workaround**: Manual database restoration required from backup
- **Reference**: [Known Issue #789](https://github.com/your-org/hotel-voice-bot/issues/789)
-->

## Post-mortem
- [ ] If incident ≥ P1, schedule a 30-min post-mortem within 48 h  
- [ ] File findings in /docs/post-mortems/YYYY-MM-DD-<slug>.md

## References

- [Kubernetes Rollback Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment)
- [AWS ECS Rollback Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/update-service.html)
- [Fly.io Rollback Documentation](https://fly.io/docs/flyctl/rollback/)
- [Incident Response Best Practices](https://response.pagerduty.com/)
