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
