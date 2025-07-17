# Fly.io Migration Plan

## Overview
This document outlines the complete migration plan from AWS to Fly.io infrastructure for the Hotel Voice Bot application.

## Migration Checklist

### Phase 1: Infrastructure Setup ✅
- [x] Create Fly.io account and organization
- [x] Set up Fly.io CLI and authentication
- [x] Configure production and staging environments
- [x] Set up regional deployment (Singapore for optimal Thailand latency)
- [x] Configure machine specifications for cost optimization

### Phase 2: Database & Storage ✅
- [x] Set up Backblaze B2 for backup storage
- [x] Configure backup automation with rclone
- [x] Test backup and restore procedures
- [x] Set up multipart upload for large files
- [x] Configure lifecycle policies for backup retention

### Phase 3: Application Configuration ✅
- [x] Create Fly.io deployment configurations (fly.toml, fly.staging.toml)
- [x] Configure environment variables and secrets
- [x] Set up health check endpoints
- [x] Configure auto-scaling and resource limits
- [x] Set up monitoring and logging

### Phase 4: Testing & Validation ✅
- [x] Fix Jest configuration for ESM support
- [x] Set up Cypress E2E testing framework
- [x] Create comprehensive test suite
- [x] Test backup integrity verification
- [x] Performance and load testing setup

### Phase 5: Documentation ✅
- [x] Create deployment documentation
- [x] Write quickstart guide for Fly.io
- [x] Document secrets management
- [x] Create post-deployment checklist
- [x] Document rollback procedures

### Phase 6: Deployment & Go-Live (IN PROGRESS)
- [ ] Deploy staging environment
- [ ] Run end-to-end tests on staging
- [ ] Verify B2 backup integration
- [ ] Deploy production environment
- [ ] DNS cutover and traffic routing
- [ ] Monitor application performance

### Phase 7: Post-Migration ✅
- [x] Archive old AWS documentation
- [x] Update CI/CD pipelines
- [x] Create v2.0.0-fly release tag
- [x] Update operational runbooks

## Key Infrastructure Changes

### Regional Deployment
- **Primary Region**: Singapore (sin) - Optimal for Thailand operations
- **Backup Regions**: Chennai (cyn), Sydney (syd)
- **Latency Target**: < 100ms from Bangkok

### Cost Optimization
- **Machine Configuration**: shared-cpu-1x with 256MB memory
- **Auto-scaling**: 0-2 machines for staging, 1-3 for production
- **Auto-stop**: Enabled for cost savings during low traffic

### Backup Strategy
- **Storage**: Backblaze B2 with multi-region redundancy
- **Frequency**: Daily automated backups
- **Retention**: 30 days for regular backups, 1 year for monthly snapshots
- **Verification**: Automated integrity checks

## Security Considerations

### Secrets Management
- All secrets managed through Fly.io secrets
- Environment-specific secret isolation
- Regular secret rotation procedures
- No hardcoded credentials in code

### Network Security
- HTTPS enforcement for all traffic
- Internal service communication encryption
- VPC isolation between environments
- Rate limiting and DDoS protection

## Performance Benchmarks

### Target Performance
- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 50ms (average)
- **Static Asset Load**: < 100ms
- **End-to-End Request**: < 500ms

### Monitoring Setup
- Application performance monitoring
- Database connection pooling
- Resource utilization alerts
- Error rate monitoring

## Risk Assessment

### Migration Risks
- **Risk Level**: Medium
- **Key Risks**:
  - Data loss during migration
  - Service downtime during cutover
  - Performance degradation
  - Integration compatibility issues

### Mitigation Strategies
- Comprehensive backup verification before cutover
- Blue-green deployment strategy
- Rollback procedures documented and tested
- Staging environment mirrors production exactly

## Rollback Plan

### Immediate Rollback (< 1 hour)
1. Revert DNS changes to AWS infrastructure
2. Restore from latest backup if data corruption
3. Notify stakeholders of rollback

### Full Rollback (< 4 hours)
1. Restore complete AWS infrastructure
2. Migrate data back from Fly.io
3. Verify all integrations working
4. Post-mortem analysis

## Success Criteria

- [ ] All services running on Fly.io with 99.9% uptime
- [ ] Performance metrics meet or exceed AWS benchmarks
- [ ] All tests passing in staging and production
- [ ] Backup and restore procedures verified
- [ ] Cost reduction of 40% compared to AWS
- [ ] Zero data loss during migration

## Post-Migration Tasks

### Week 1
- [ ] Daily monitoring and performance checks
- [ ] Resolve any minor issues or optimizations
- [ ] Gather feedback from operations team

### Week 2-4
- [ ] Performance tuning based on real-world usage
- [ ] Optimize auto-scaling configurations
- [ ] Cost analysis and optimization

### Month 2-3
- [ ] Full operational maturity assessment
- [ ] Documentation review and updates
- [ ] Team training on new infrastructure

## Contact Information

**Migration Lead**: Tyler (hello@coconutbeachkohphangan.com)
**DevOps Team**: [To be assigned]
**Emergency Contact**: [To be assigned]

## References

- [Fly.io Documentation](https://fly.io/docs/)
- [Backblaze B2 Documentation](https://www.backblaze.com/b2/docs/)
- [Project Deployment Guide](./DEPLOYMENT.md)
- [Quickstart Guide](./QUICKSTART_FLY.md)
- [Post-Deploy Checklist](./POST_DEPLOY_CHECKLIST.md)
