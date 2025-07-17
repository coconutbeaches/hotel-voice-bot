import { createServer } from 'http';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import voiceRouter from './routes/voice.js';
import { setupVoiceSocket } from './routes/voiceSocket.js';
import whatsappRouter from './routes/whatsapp.js';
import { setupWaha } from './scripts/setupWaha.js';
import swaggerSpec from './swagger.js';
import { logger } from './utils/logger.js';

console.log('=== Server Startup Debug ===');
console.log('Starting server initialization...');

const app: express.Application = express();
const PORT = Number(process.env.PORT) || 8080;

console.log(`PORT configured as: ${PORT}`);

// Middleware
app.use(helmet());
app.use(cors());

// Raw body middleware for WhatsApp webhook verification
app.use('/api/whatsapp/webhook', (req, res, next) => {
  (req as any).rawBody = '';
  req.on('data', chunk => {
    (req as any).rawBody += chunk;
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
app.use('/api/voice', voiceRouter);
app.use('/api/whatsapp', whatsappRouter);

// Error handling
app.use(errorHandler);

// Create HTTP server
const httpServer = createServer(app);

// Setup WebSocket
setupVoiceSocket(httpServer);

// Wrap server startup in try-catch
try {
  console.log('About to start server...');
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('Server started successfully!');

    // Make WAHA setup non-blocking
    setupWaha().catch(error => {
      logger.error('WAHA setup failed but server continues', error);
    });

    logger.info(`Server running on port ${PORT}`);
    logger.info(
      `API documentation available at http://localhost:${PORT}/api-docs`
    );
    logger.info(`WebSocket endpoint available at ws://localhost:${PORT}`);
  });

  // Handle server errors
  httpServer.on('error', (error: any) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
    }
    process.exit(1);
  });

  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
} catch (error) {
  console.error('Fatal error during server startup:', error);
  process.exit(1);
}

export default app;
