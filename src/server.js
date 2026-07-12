const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`PateSystem corriendo en puerto ${config.port}`);
  console.log(`Data dir: ${config.dataDir}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando...');
  server.close(() => process.exit(0));
});

module.exports = server;
