import { createServer } from 'node:http';
import { attachGameServer } from './server.js';

const port = Number(process.env.PORT ?? 3001);
const httpServer = createServer();
attachGameServer(httpServer);
httpServer.listen(port, () => {
  console.log(`zero-patients server listening on :${port}`);
});
