import winston from 'winston';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.simple(),
  }),
];

// Only add file transports in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hotel-voice-bot-api' },
  transports,
});

// Log to Logtail or Datadog via HTTP/JSON if configured
if (process.env.LOGTAIL_TOKEN) {
  // Send logs to Logtail as structured JSON
  logger.add(
    new winston.transports.Http({
      host: 'in.logtail.com',
      path: '/?source_token=' + process.env.LOGTAIL_TOKEN,
      ssl: true,
      format: winston.format.json(),
    })
  );
}
if (process.env.DATADOG_LOGS_API_KEY) {
  // Send logs to Datadog as structured JSON
  logger.add(
    new winston.transports.Http({
      host: 'http-intake.logs.datadoghq.com',
      path: '/v1/input/' + process.env.DATADOG_LOGS_API_KEY,
      ssl: true,
      format: winston.format.json(),
      headers: {
        'DD-API-KEY': process.env.DATADOG_LOGS_API_KEY,
        'Content-Type': 'application/json'
      }
    })
  );
}
