import type { IncomingMessage, ServerResponse } from 'http';

function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const { message, level = 'info', context = {} } = JSON.parse(body);

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
      }));

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
    } catch (error) {
      console.error('Error parsing log request body:', error);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Bad Request: Invalid JSON' }));
    }
  });
}

module.exports = handler;
