import { createServer } from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { initSocket } from './realtime/socket.js';

const startServer = async () => {
  const server = createServer(app);
  
  initSocket(server);

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      logger.warn(`Puerto ${env.PORT} en uso, intentando con ${env.PORT + 1}...`);
      server.listen(env.PORT + 1);
    } else {
      logger.error({ err: e }, 'Error en el servidor');
      process.exit(1);
    }
  });

  server.listen(env.PORT, () => {
    logger.info(`Servidor escuchando en puerto ${server.address()?.valueOf()}`);
  });

  const shutdown = () => {
    logger.info('Apagando servidor...');
    server.close(() => {
      logger.info('Servidor apagado');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer().catch((err) => {
  logger.error({ err }, 'Error iniciando servidor');
  process.exit(1);
});
