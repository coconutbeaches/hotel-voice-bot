# RUNBOOK

## Local Development
- Start services with `docker compose up` from project root.
- Check `docker compose ps` for container status.
- If needed, clean previous runs with `docker compose down` and remove volumes: `docker compose down -v`.

## Running Tests
- Run tests with: `npm test` (update if your actual test runner differs).
- Ensure all containers are started if tests depend on APIs or databases.

## Common Failure Modes

### Docker Issues
- **Ports in use**: Stop previous containers or kill local processes on the ports.
- **Containers exiting immediately**: Review logs with `docker compose logs <service>`.

### API/Service Not Responding
- Ensure `.env` settings are right and no port conflicts.
- Verify database/API credentials and network configs.

### Third-Party Limitations
- **API rate-limits**: Pause and retry after cooldown; check provider docs for quota.
- **Cost overruns**: Monitor API dashboard; set up usage alerts if possible.
---

## Reference
- More integration detail in `docs/WAHA_INTEGRATION.md`.
- For database admin, you can run SQL scripts in Supabase.
