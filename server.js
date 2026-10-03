const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.error(err.name, err.message);
  console.error('Uncaught exception. Shutting down.');
  process.exit(1);
});

dotenv.config({ path: './config.env', quiet: true });

const app = require('./app');
const port = process.env.PORT || 1000;
const connectionString = process.env.CONN_STR;

if (!connectionString || !process.env.SECRET_STR) {
  console.error('CONN_STR and SECRET_STR are required. Set environment variables or configure config.env.');
  process.exit(1);
}

let server;
mongoose.connect(connectionString).then(() => {
  console.log('Database connection successful');
  server = app.listen(port, '0.0.0.0', () => console.log(`Server listening on port ${port}`));
}).catch(() => {
  console.error('Database connection failed. Check the connection string and database network access.');
  process.exit(1);
});

function shutdown(exitCode = 0) {
  const timeout = setTimeout(() => process.exit(exitCode), 10000);
  timeout.unref();
  const finish = async () => { await mongoose.disconnect(); process.exit(exitCode); };
  if (server) server.close(finish); else finish();
}
process.on('SIGTERM', () => shutdown());
process.on('SIGINT', () => shutdown());

process.on('unhandledRejection', (err) => {
  console.error(err.name, err.message);
  console.error('Unhandled rejection. Shutting down.');
  shutdown(1);
});
