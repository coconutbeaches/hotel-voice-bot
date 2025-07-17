# Hotel Voice Bot Hot-patch Runbook

<!-- Last Updated: 2025-07-17 -->

## Overview

This runbook provides step-by-step instructions for deploying hot-patches to the Hotel Voice Bot without causing major downtime or disruption.

## Prerequisites

- [ ] Access to deployment environment (AWS ECS, Fly.io, or Kubernetes)
- [ ] Approved hot-patch change
- [ ] Validated code changes
- [ ] All unit tests passing
- [ ] Automated test suite passing

## Hot-patch Preparation

### 1. Code Preparation

- [ ] Ensure code changes are minimal and targeted
- [ ] Code review and approval completed
- [ ] Ensure all tests are written and passing
- [ ] Verify code style with linting tools

### 2. Environment Preparation

- [ ] Validate environment variables for hot-patch
- [ ] Ensure backup is available
- [ ] Prepare rollback plans

## Deployment Steps

### Step 1: Repository Update

1. **Pull Latest Code**

   ```bash
   git pull origin master
   ```

2. **Checkout Hot-patch Branch**

   ```bash
   git checkout -b hotfix/quick-patch-01
   ```

3. **Apply Hot-patch Changes**

   Ensure changes are minimal, focusing only on critical bug or issue resolution.

   Commit message example:

   ```
   git commit -m "hotfix: resolved validation bug in conversation API"
   ```

4. **Push Changes**
   ```bash
   git push origin hotfix/quick-patch-01
   ```

### Step 2: Pipeline Execution

1. **Deploy to Staging**

   Automated CI/CD should deploy changes to staging for immediate testing.

2. **Run Test Suite**

   Ensure all tests are passing on the staging environment.

3. **Manual Testing**

   Conduct targeted manual tests to ensure patch correctness and no new critical issues.

### Step 3: Hot-patch Deployment

#### Option A: AWS ECS Deployment

1. **Update Service**

   ```bash
   aws ecs update-service --cluster hotel-voice-bot --service hotel-voice-bot-service --force-new-deployment
   ```

2. **Monitor Logs and Health**
   ```bash
   aws ecs describe-services --cluster hotel-voice-bot --services hotel-voice-bot-service
   aws ecs logs --follow --cluster hotel-voice-bot --service hotel-voice-bot-service
   ```

#### Option B: Fly.io Deployment

1. **Deploy Application**

   ```bash
   fly deploy
   ```

2. **Check Logs and Deployment Status**
   ```bash
   fly logs
   fly status
   ```

#### Option C: Kubernetes Deployment

1. **Apply Manifests**

   ```bash
   kubectl apply -f deploy/k8s/deployment.yml
   kubectl rollout restart deployment hotel-voice-bot -n hotel-voice-bot
   ```

2. **Monitor Deployment Status**
   ```bash
   kubectl rollout status deployment/hotel-voice-bot -n hotel-voice-bot
   kubectl get pods -n hotel-voice-bot
   kubectl logs -f -n hotel-voice-bot pod/[POD_NAME]
   ```

### Step 4: Verification

1. **Verify Hot-patch**
   Conduct a series of checks to ensure that the hot-patch was successful, that critical functionalities are working as expected, and that no new issues have emerged.

2. **Regression Testing**
   Execute regression tests to ensure other functionalities remain unaffected.

3. **Server Response and Health Checks**
   ```bash
   curl -f https://your-domain.com/api/health
   curl -X GET "https://your-domain.com/api/faqs?language=en"
   ```

### Post-Deployment Review

- Conduct a post-deployment review with development team
- Document any new issues identified during verification
- Schedule regular follow-up and further testing sessions if required

### Monitoring and Alerts

- Implement monitoring for any anomalies post-deployment
- Alert engineering team of any errors immediately

## Contact Information

- **DevOps Team**: devops@yourcompany.com
- **On-Call Engineer**: +1-xxx-xxx-xxxx
- **Project Manager**: pm@yourcompany.com
- **Technical Lead**: tech-lead@yourcompany.com

## Related Docs

- [**Deployment Runbook**](./deployment.md) - Use this for full production deployments
- [**Rollback Runbook**](./rollback.md) - Use this if hot-patch fails or causes issues

## Known Issues/Caveats

*Document any known issues, edge cases, or operational caveats discovered during hot-patch operations. For new issues, please create a [Known Issues ticket](.github/ISSUE_TEMPLATE/known_issues.md) and reference it here.*

<!-- Example:
### Issue: Hot-patch Deployment Fails on Kubernetes v1.24+
- **Severity**: Medium
- **Workaround**: Use `kubectl patch` instead of `kubectl apply`
- **Reference**: [Known Issue #456](https://github.com/your-org/hotel-voice-bot/issues/456)
-->

## References

- [AWS ECS Hot-patch Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_hotpatches.html)
- [Fly.io Hot-patch Documentation](https://fly.io/docs/hot-patching/)
- [Kubernetes Hot-patch Procedures](https://kubernetes.io/docs/tasks/run-application/update-api-object-kubectl-patch/)
