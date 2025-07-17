import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import whatsappRouter from './routes/whatsapp.js';
import { setupWaha } from './scripts/setupWaha.js';
import swaggerSpec from './swagger.js';
import { logger } from './utils/logger.js';

const app: express.Application = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());

// Raw body middleware for WhatsApp webhook verification
app.use('/api/whatsapp/webhook', (req, res, next) => {
  req.rawBody = '';
  req.on('data', chunk => {
    req.rawBody += chunk;
  });
  req.on('end', () => {
    next();
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/whatsapp', whatsappRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  setupWaha();
  logger.info(`Server running on port ${PORT}`);
  logger.info(
    `API documentation available at http://localhost:${PORT}/api-docs`
  );
});

export default app;
