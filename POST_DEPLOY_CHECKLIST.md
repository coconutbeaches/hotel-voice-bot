# Post-Deploy Verification Checklist

Complete this checklist after each production deployment to ensure the system is healthy and functioning correctly.

## 1. Infrastructure Health Check

### Fly.io Status and Machine Health
- [ ] Run `fly status` to check application status
- [ ] Verify all machines are running and healthy
- [ ] Check machine resource utilization is within normal limits
- [ ] Review recent deployment logs with `fly logs`

### Application Logs
- [ ] Check for any error messages in application logs
- [ ] Verify no critical warnings or exceptions
- [ ] Confirm successful startup messages are present

## 2. Health Endpoint Verification

### SSL Health Check
- [ ] Hit `/api/health` endpoint over SSL (HTTPS)
- [ ] Verify response status is 200 OK
- [ ] Check response includes expected health indicators
- [ ] Confirm SSL certificate is valid and not expired

Example command:
```bash
curl -v https://your-app.fly.dev/api/health
```

## 3. Integration Testing

### Production URL Testing
- [ ] Run integration test script against production URL
- [ ] Verify all critical user journeys work correctly
- [ ] Check API endpoints return expected responses
- [ ] Confirm authentication and authorization work properly

Example command:
```bash
npm run test:integration -- --env=production
# or
python -m pytest tests/integration/ --url=https://your-app.fly.dev
```

## 4. Configuration Verification

### Secrets Management
- [ ] Confirm all required secrets are present with `fly secrets list`
- [ ] Verify no sensitive information is exposed in logs
- [ ] Check environment variables are correctly set
- [ ] Ensure database connection strings are working

Example command:
```bash
fly secrets list
```

## 5. Data Backup Verification

### Backblaze B2 Backup
- [ ] Trigger manual backup to B2 storage
- [ ] Verify backup object exists in B2 bucket
- [ ] Check backup file size and timestamp are reasonable
- [ ] Confirm backup can be restored if needed

Example commands:
```bash
# Trigger backup (adjust based on your backup script)
fly ssh console -c "npm run backup:manual"
# or
fly ssh console -c "python manage.py backup"

# Verify in B2 (using B2 CLI if available)
b2 ls your-bucket-name
```

## 6. Performance Check

### Latency Verification from Bangkok
- [ ] Check response latency from Bangkok region
- [ ] Verify latency is within acceptable limits (< 500ms for API calls)
- [ ] Test multiple endpoints to ensure consistent performance
- [ ] Compare with baseline performance metrics

Example command:
```bash
curl -w 'Total time: %{time_total}s\n' -o /dev/null -s https://your-app.fly.dev/api/health
```

For comprehensive latency testing:
```bash
# Test multiple endpoints
for endpoint in /api/health /api/users /api/data; do
  echo "Testing $endpoint:"
  curl -w 'Total time: %{time_total}s\n' -o /dev/null -s "https://your-app.fly.dev$endpoint"
done
```

## 7. Additional Verification Steps

### Database Health
- [ ] Check database connection is working
- [ ] Verify recent migrations applied successfully
- [ ] Confirm critical data is accessible
- [ ] Check database performance metrics

### Monitoring and Alerts
- [ ] Verify monitoring dashboards show healthy metrics
- [ ] Check that alerting systems are functioning
- [ ] Confirm error tracking is capturing events
- [ ] Review performance monitoring data

### Security Check
- [ ] Verify HTTPS is enforced
- [ ] Check security headers are present
- [ ] Confirm no sensitive data in response headers
- [ ] Validate CORS settings are correct

## Completion

- [ ] All checks passed successfully
- [ ] Any issues identified have been documented
- [ ] Stakeholders notified of deployment status
- [ ] Deployment marked as successful in tracking system

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Version/Commit:** ___________  
**Notes:** ___________

---

## Emergency Rollback

If any critical issues are discovered during verification:

1. **Immediate Action:**
   ```bash
   fly deploy --image previous-working-image
   ```

2. **Document Issues:**
   - Record what failed and when
   - Capture error messages and logs
   - Note impact on users

3. **Communication:**
   - Notify stakeholders immediately
   - Update status page if applicable
   - Prepare incident report

## Contact Information

- **On-call Engineer:** ___________
- **DevOps Team:** ___________
- **Emergency Escalation:** ___________
