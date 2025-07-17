# Managing Secrets with Fly.io

This document describes how to manage secrets using Fly.io for the hotel voice bot application deployment.

## Overview

Fly.io secrets are encrypted environment variables that are securely injected into your application at runtime. They are perfect for storing sensitive information like API keys, database credentials, and authentication tokens.

## Setting Secrets

### Basic Usage

To set a single secret:

```sh
fly secrets set SECRET_NAME=secret-value
```

### Setting Multiple Secrets

You can set multiple secrets in one command:

```sh
fly secrets set SECRET_NAME1=value1 SECRET_NAME2=value2
```

### From Environment File

You can also set secrets from a file (useful for initial setup):

```sh
fly secrets import < secrets.env
```

## Required Secrets for Hotel Voice Bot

Here are the essential secrets that need to be set for the application:

### Core Application Secrets

```sh
# Database
fly secrets set DATABASE_URL=postgresql://user:password@host:5432/database
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
fly secrets set OPENAI_API_KEY=sk-proj-your-openai-key

# WAHA (WhatsApp)
fly secrets set WAHA_TOKEN=your-waha-token
fly secrets set WAHA_API_KEY=your-waha-api-key
fly secrets set WAHA_WEBHOOK_TOKEN=your-webhook-token

# Backblaze B2
fly secrets set B2_APPLICATION_KEY_ID=your-b2-key-id
fly secrets set B2_APPLICATION_KEY=your-b2-application-key
fly secrets set B2_BUCKET_NAME=your-bucket-name

# Security
fly secrets set JWT_SECRET=your-jwt-secret
fly secrets set ENCRYPTION_KEY=your-encryption-key

# External Services
fly secrets set HOTEL_MANAGEMENT_API_KEY=your-hotel-api-key
```

### Optional Secrets (for legacy integrations)

```sh
# AWS (if still needed)
fly secrets set AWS_ACCESS_KEY_ID=your-access-key
fly secrets set AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Secret Rotation Schedule

### High-Priority Secrets (Rotate every 30 days)
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Medium-Priority Secrets (Rotate every 90 days)
- `OPENAI_API_KEY`
- `B2_APPLICATION_KEY`
- `WAHA_API_KEY`
- `HOTEL_MANAGEMENT_API_KEY`

### Low-Priority Secrets (Rotate every 180 days)
- `WAHA_TOKEN`
- `WAHA_WEBHOOK_TOKEN`
- `B2_APPLICATION_KEY_ID`

## Rotation Workflow

1. **Generate New Secret**: Create a new secret value using appropriate method (API console, random generator, etc.)
2. **Update External Service**: If applicable, update the secret in the external service first
3. **Update Fly.io Secret**: Use `fly secrets set` to update the secret
4. **Verify Deployment**: Check that the application restarts and works correctly
5. **Document**: Log the rotation in your security audit trail

### Example Rotation Commands

```sh
# Rotate JWT secret
fly secrets set JWT_SECRET=new-jwt-secret-value

# Rotate OpenAI API key
fly secrets set OPENAI_API_KEY=sk-proj-new-openai-key

# Rotate B2 application key
fly secrets set B2_APPLICATION_KEY=new-b2-application-key
```

## Managing Secrets

### List All Secrets

```sh
fly secrets list
```

### Remove a Secret

```sh
fly secrets unset SECRET_NAME
```

### Update Multiple Secrets

```sh
fly secrets set SECRET1=new-value1 SECRET2=new-value2
```

## Security Best Practices

1. **Never commit secrets to version control**
2. **Use strong, unique values for each secret**
3. **Rotate secrets regularly according to the schedule above**
4. **Monitor secret usage and access logs**
5. **Use least-privilege principle for secret access**
6. **Keep a secure backup of critical secrets**
7. **Document all secret rotations with dates and reasons**

## Troubleshooting

### Application Not Starting After Secret Update

1. Check if the secret format is correct
2. Verify the secret value doesn't contain special characters that need escaping
3. Ensure the application code is reading the environment variable correctly
4. Check application logs with `fly logs`

### Secret Not Available in Application

1. Verify the secret is set with `fly secrets list`
2. Check if the application has restarted after secret update
3. Ensure the environment variable name matches exactly
4. Force a restart with `fly deploy --no-cache`

## Automation

For automated secret rotation, consider:

1. **GitHub Actions**: Set up workflows to rotate secrets on schedule
2. **External Secret Management**: Use tools like HashiCorp Vault
3. **Monitoring**: Set up alerts for secret expiration
4. **Backup**: Automate secure backup of critical secrets

## Emergency Procedures

### Compromised Secret

1. **Immediate**: Revoke the secret at the source (API provider, database, etc.)
2. **Generate**: Create a new secret value immediately
3. **Update**: Set the new secret in Fly.io
4. **Verify**: Confirm application functionality
5. **Document**: Record the incident and response

### Lost Secret

1. **Check Backups**: Look for securely stored backups
2. **Regenerate**: Create new secret at the source
3. **Update**: Set new secret in Fly.io
4. **Test**: Verify application functionality
5. **Review**: Improve backup procedures
