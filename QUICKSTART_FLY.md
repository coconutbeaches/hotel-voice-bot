# Quickstart Guide for Fly.io Deployment

This guide will take you through the process of deploying an app with Fly.io, setting up necessary secrets, and managing backups. 

## Prerequisites
Make sure you have Homebrew installed on your MacOS system. If not, you can install it by running:
```shell
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## Step 1: Install Flyctl and Login
1. **Install Flyctl**:
    ```shell
    brew install flyctl
    ```

2. **Authenticate with Fly.io**:
    ```shell
    fly auth login
    ```

## Step 2: Launch Your Application
Choose one of the following methods:
1. **Using `fly launch`**:
    ```shell
    fly launch
    ```

2. **Or create a specific app name**:
    ```shell
    fly apps create hotel-voice-bot
    ```

## Step 3: Set Required Secrets
Ensure you have all the necessary environment variables set up for your application by running:
```shell
fly secrets set VARIABLE_NAME=value
```
Replace `VARIABLE_NAME` and `value` with your actual secret names and their values.

## Step 4: Deploy the Application
Deploy your application to Fly.io:
```shell
fly deploy
```

## Step 5: Trigger a Backup
Use GitHub CLI to trigger a backup of the database:
```shell
gh workflow run backup-database.yml --ref main
```

## Step 6: Restore from Backup
To restore from a backup, use the following instructions:
1. **Download the backup file from B2** (replace `<backup-url>` with the actual URL):
   ```shell
   curl -o backup.dump <backup-url>
   ```
2. **Restore using `pg_restore`**:
   ```shell
   pg_restore -U your_db_user -d your_db_name backup.dump
   ```
   Replace `your_db_user` and `your_db_name` with your actual database username and name. 

---
This guide provides an overview of deploying and managing applications in Fly.io, along with handling backups efficiently. For more detailed usage, refer to the official Fly.io documentation.
