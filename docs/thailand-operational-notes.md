# Thailand-Specific Operational Notes

## Overview
This document outlines key operational considerations for running services and development workflows from Thailand, covering infrastructure, scheduling, billing, and security aspects.

## Recommended Cloud Regions

### AWS Regions
- **Primary**: `ap-southeast-1` (Singapore)
  - Lowest latency from Thailand (~20-30ms)
  - Full service availability
  - Cost-effective for egress traffic
- **Secondary**: `ap-southeast-3` (Jakarta) 
  - Alternative option with good latency
  - Growing service availability

### Google Cloud Regions
- **Primary**: `asia-southeast1` (Singapore)
  - Optimal latency and performance
  - Comprehensive service catalog
- **Secondary**: `asia-southeast2` (Jakarta)
  - Backup option for redundancy

### Azure Regions
- **Primary**: `Southeast Asia` (Singapore)
  - Best latency for Thailand-based operations
  - Full Azure service portfolio

### Regional Considerations
- **Latency**: Singapore regions typically provide 20-40ms latency from Bangkok
- **Egress Costs**: Singapore regions offer competitive egress pricing to Thailand
- **Compliance**: Consider data residency requirements if handling Thai user data
- **Redundancy**: Consider multi-region setup with Jakarta as secondary

## GitHub Workflows Timezone Configuration

### Scheduled Workflows
Configure all scheduled GitHub Actions to use Bangkok timezone:

```yaml
# .github/workflows/scheduled-job.yml
name: Scheduled Job
on:
  schedule:
    # Run at 9:00 AM Bangkok time (02:00 UTC)
    - cron: '0 2 * * *'
    # Run at 6:00 PM Bangkok time (11:00 UTC)
    - cron: '0 11 * * *'

jobs:
  scheduled-task:
    runs-on: ubuntu-latest
    env:
      TZ: Asia/Bangkok
    steps:
      - name: Display current time
        run: |
          echo "Current UTC time: $(date -u)"
          echo "Current Bangkok time: $(TZ=Asia/Bangkok date)"
```

### Workflow Configuration Best Practices
- **Always set `TZ: Asia/Bangkok`** in workflow environment variables
- **Use UTC times in cron expressions** but document Bangkok equivalent
- **Consider business hours** when scheduling deployments (avoid 9 AM - 6 PM Bangkok time)
- **Weekend deployments** are typically safer (schedule for Saturday/Sunday)

### Time Conversion Reference
- Bangkok (UTC+7) to UTC: subtract 7 hours
- UTC to Bangkok: add 7 hours
- Example: 9:00 AM Bangkok = 2:00 AM UTC

## Billing Considerations

### Currency Conversion (THB ↔ USD)
- **Exchange Rate Volatility**: THB/USD rates can fluctuate significantly
- **Budget Planning**: Add 10-15% buffer for currency fluctuations
- **Monitoring**: Set up alerts for significant rate changes
- **Payment Methods**: Consider USD-denominated accounts to avoid conversion fees

### VAT and Invoice Requirements
- **Thai VAT Rate**: 7% on most digital services
- **Invoice Requirements**: Ensure invoices include:
  - Thai VAT registration number (if applicable)
  - Proper business address in Thailand
  - Correct tax classification codes
- **Record Keeping**: Maintain invoices for 5 years per Thai tax law
- **Tax Advisor**: Consult with Thai tax professional for compliance

### Cost Optimization
- **Reserved Instances**: Consider 1-year terms for predictable workloads
- **Spot Instances**: Use for development/testing environments
- **Data Transfer**: Optimize egress costs by using CDN with Thai edge locations
- **Storage Classes**: Use appropriate storage tiers based on access patterns

## SMS/Call Availability for 2FA

### International Roaming Considerations
- **Enable International Roaming** before traveling
- **Roaming Charges**: Can be expensive for SMS/calls
- **Network Coverage**: Verify carrier coverage in destination countries

### Alternative 2FA Methods
- **Authenticator Apps**: Recommended primary method
  - Google Authenticator
  - Authy
  - Microsoft Authenticator
- **Hardware Keys**: Most reliable for international travel
  - YubiKey
  - Google Titan Security Key
- **Backup Codes**: Always generate and store securely

### Service-Specific 2FA Setup
- **GitHub**: Enable authenticator app + backup codes
- **AWS**: Use MFA device + backup methods
- **Google Cloud**: Hardware keys recommended
- **Azure**: Authenticator app + backup codes

### Emergency Access Planning
- **Backup Devices**: Configure 2FA on multiple devices
- **Recovery Codes**: Print and store securely
- **Emergency Contacts**: Designate trusted contacts for account recovery
- **VPN Access**: Ensure VPN works from Thailand for accessing geo-restricted services

## Network and Connectivity

### Internet Service Providers
- **Fiber Options**: AIS, True, 3BB for high-speed connections
- **Backup Connections**: Mobile hotspot as failover
- **VPN Requirements**: Some services may require VPN access

### Performance Optimization
- **CDN Configuration**: Use providers with Thai edge locations
- **DNS Optimization**: Use Thai-based DNS servers (1.1.1.1, 8.8.8.8)
- **Load Balancing**: Consider Asia-Pacific load balancer configurations

## Security Considerations

### Access Controls
- **IP Whitelisting**: Update allow lists for Thai IP ranges
- **VPN Access**: Ensure VPN connectivity for secure access
- **Time-based Access**: Consider business hours restrictions

### Data Protection
- **Local Data Laws**: Understand Thai data protection requirements
- **Cross-border Data**: Ensure compliance with data transfer regulations
- **Encryption**: Use strong encryption for data at rest and in transit

## Monitoring and Alerting

### Time-aware Monitoring
- **Alert Schedules**: Configure for Bangkok business hours
- **Escalation Policies**: Consider time zone differences for on-call rotations
- **Maintenance Windows**: Schedule during off-peak hours (2-6 AM Bangkok time)

### Performance Monitoring
- **Latency Monitoring**: Track response times from Thai locations
- **Availability Monitoring**: Use synthetic monitoring from Asian regions
- **Error Tracking**: Configure timezone-aware logging and alerting

## Emergency Procedures

### Incident Response
- **Communication Channels**: Ensure Slack/Teams work from Thailand
- **Emergency Contacts**: Maintain updated contact information
- **Escalation Procedures**: Account for time zone differences

### Business Continuity
- **Backup Systems**: Ensure systems can be managed remotely
- **Documentation**: Keep operational procedures accessible
- **Authority Delegation**: Ensure team members can act during Thai business hours

## Resources and References

### Documentation Links
- [AWS Asia Pacific Regions](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/)
- [Google Cloud Locations](https://cloud.google.com/about/locations)
- [Azure Regions](https://azure.microsoft.com/en-us/global-infrastructure/geographies/)
- [GitHub Actions Timezone](https://docs.github.com/en/actions/learn-github-actions/environment-variables)

### Time Zone Tools
- [World Clock](https://www.worldtimebuddy.com/)
- [Cron Expression Generator](https://crontab.guru/)
- [Time Zone Converter](https://www.timeanddate.com/worldclock/converter.html)

### Thai Business Resources
- [Thai Revenue Department](https://www.rd.go.th/)
- [Digital Economy Promotion Agency](https://www.depa.or.th/)
- [Office of the National Broadcasting and Telecommunications Commission](https://www.nbtc.go.th/)

---

*Last updated: [Current Date]*
*Next review: [3 months from current date]*
