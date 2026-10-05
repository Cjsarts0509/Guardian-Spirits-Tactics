import { loadConfig } from './config.js';
import { createGameServer } from './server.js';

const cfg = loadConfig();
const server = createGameServer(cfg);
const port = await server.listen();
console.log(
  `[gst-server] :${port} guests=${cfg.allowGuests} bots=${cfg.allowBots} auth=${cfg.supabaseUrl ? 'jwks' : cfg.supabaseJwtSecret ? 'hs256' : 'off'} persist=${!!(cfg.supabaseUrl && cfg.supabaseSecretKey)}`,
);

const shutdown = async () => {
  console.log('[gst-server] 종료 중…');
  await server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
