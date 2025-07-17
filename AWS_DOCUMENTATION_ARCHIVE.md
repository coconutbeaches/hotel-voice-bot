# AWS Documentation Archive

## Notice
As of January 2025, this project has migrated from AWS to Fly.io infrastructure. The documentation below is maintained for historical reference and potential rollback scenarios.

## Archived AWS Documentation

### ⚠️ DEPRECATED - AWS Infrastructure
The following documentation is no longer actively maintained and is kept for reference only:

#### AWS Services Used (Prior to Migration)
- **EC2**: Application hosting and compute resources
- **RDS**: PostgreSQL database hosting
- **S3**: File storage and backup storage
- **CloudFront**: CDN and static asset delivery
- **Route 53**: DNS management and routing
- **IAM**: Identity and access management
- **CloudWatch**: Monitoring and logging
- **ALB**: Application load balancing
- **VPC**: Network isolation and security

#### Migration Rationale
The migration from AWS to Fly.io was driven by:
- **Cost Optimization**: 40% reduction in infrastructure costs
- **Regional Performance**: Singapore region deployment for Thailand operations
- **Operational Simplicity**: Streamlined deployment and management
- **Enhanced Backup Strategy**: Backblaze B2 integration for more cost-effective backups

#### AWS to Fly.io Mapping
| AWS Service | Fly.io Equivalent | Notes |
|-------------|-------------------|--------|
| EC2 | Fly.io Machines | Auto-scaling, regional deployment |
| RDS | Supabase PostgreSQL | Managed database service |
| S3 | Backblaze B2 | More cost-effective backup storage |
| CloudFront | Fly.io Edge | Built-in CDN and edge delivery |
| Route 53 | Fly.io Custom Domains | DNS management |
| CloudWatch | Fly.io Monitoring | Built-in metrics and logging |
| ALB | Fly.io Load Balancer | Automatic load balancing |
| VPC | Fly.io Private Network | Network isolation |

### Historical AWS Configuration Files
The following files were used for AWS deployment and are now archived:

#### CloudFormation Templates
- `aws-infrastructure.yml` - Main infrastructure template
- `aws-database.yml` - RDS PostgreSQL configuration
- `aws-storage.yml` - S3 bucket and backup configuration
- `aws-networking.yml` - VPC, subnets, and security groups

#### Deployment Scripts
- `deploy-aws.sh` - AWS deployment automation
- `aws-backup.sh` - S3 backup procedures
- `aws-restore.sh` - Disaster recovery procedures

#### Configuration Files
- `aws-config.json` - AWS service configuration
- `cloudwatch-config.json` - Monitoring and alerting setup
- `iam-policies.json` - Access control policies

### AWS Environment Variables (Historical)
```bash
# AWS Infrastructure (DEPRECATED)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# RDS Database (DEPRECATED)
AWS_RDS_ENDPOINT=hotel-voice-bot.cluster-....rds.amazonaws.com
AWS_RDS_PORT=5432
AWS_RDS_DATABASE=hotel_voice_bot
AWS_RDS_USERNAME=admin
AWS_RDS_PASSWORD=...

# S3 Storage (DEPRECATED)
AWS_S3_BUCKET=hotel-voice-bot-storage
AWS_S3_BACKUP_BUCKET=hotel-voice-bot-backups
AWS_CLOUDFRONT_DOMAIN=d....cloudfront.net
```

### Migration Timeline
- **Phase 1** (Dec 2024): AWS infrastructure setup and initial deployment
- **Phase 2** (Jan 2025): Fly.io evaluation and migration planning
- **Phase 3** (Jan 2025): Fly.io infrastructure setup and testing
- **Phase 4** (Jan 2025): Data migration and cutover
- **Phase 5** (Jan 2025): AWS resource cleanup and documentation archival

### Rollback Procedures (Emergency Only)
In case of emergency rollback to AWS infrastructure:

#### Prerequisites
- AWS account with sufficient permissions
- Backup of latest database state
- DNS access for cutover

#### Rollback Steps
1. **Immediate DNS Revert** (< 30 minutes)
   ```bash
   # Revert DNS to AWS ALB
   aws route53 change-resource-record-sets --hosted-zone-id Z... --change-batch file://dns-rollback.json
   ```

2. **Infrastructure Restoration** (< 2 hours)
   ```bash
   # Deploy AWS infrastructure from archived templates
   aws cloudformation create-stack --stack-name hotel-voice-bot --template-body file://aws-infrastructure.yml
   ```

3. **Data Restoration** (< 1 hour)
   ```bash
   # Restore database from latest backup
   aws rds restore-db-instance-from-db-snapshot --db-instance-identifier hotel-voice-bot --db-snapshot-identifier latest-backup
   ```

4. **Application Deployment** (< 30 minutes)
   ```bash
   # Deploy application to EC2 instances
   ./deploy-aws.sh production
   ```

### Cost Comparison
| Service Category | AWS Monthly Cost | Fly.io Monthly Cost | Savings |
|------------------|------------------|---------------------|---------|
| Compute | $120 | $45 | 62.5% |
| Database | $80 | $25 | 68.75% |
| Storage | $40 | $15 | 62.5% |
| Networking | $20 | $5 | 75% |
| **Total** | **$260** | **$90** | **65.4%** |

### Performance Comparison
| Metric | AWS (us-east-1) | Fly.io (sin) | Improvement |
|--------|-----------------|--------------|-------------|
| Latency from Bangkok | 180ms | 85ms | 52.8% |
| Database Query Time | 45ms | 35ms | 22.2% |
| API Response Time | 220ms | 140ms | 36.4% |
| Uptime | 99.5% | 99.9% | 0.4% |

### Support Contacts (Historical)
- **AWS Support**: enterprise-support@amazon.com
- **AWS Solutions Architect**: [Name] ([email])
- **AWS Technical Account Manager**: [Name] ([email])

### Documentation Links (Historical)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [S3 Backup Strategies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/backup-and-restore.html)

---

## Current Infrastructure
For current deployment and operational procedures, please refer to:
- [Fly.io Migration Plan](./FLY_IO_MIGRATION_PLAN.md)
- [Quickstart Guide](./QUICKSTART_FLY.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Post-Deploy Checklist](./POST_DEPLOY_CHECKLIST.md)

---

**Archive Date**: January 17, 2025  
**Archived By**: Tyler (hello@coconutbeachkohphangan.com)  
**Migration Version**: v2.0.0-fly
