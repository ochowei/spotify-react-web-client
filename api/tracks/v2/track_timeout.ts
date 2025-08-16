import type { IncomingMessage, ServerResponse } from 'http';

async function verifySpotifyUser(authHeader: string | string[] | undefined) {
  if (!authHeader) {
    throw new Error('No Authorization header provided');
  }

  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: authHeader as string,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      'Failed to fetch Spotify user data:',
      response.status,
      response.statusText,
      errorBody
    );
    throw new Error('Failed to verify Spotify user');
  }
  const spotifyUserData = await response.json();
  console.log('Spotify user data:', spotifyUserData);
}


function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'GET') {
    (async () => {
      try {
        const response = await fetch(
          `${process.env.KV_REST_API_URL}/hvals/tracks:timeout:hash`,
          {
            headers: {
              Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch tracks from hash:', errorText);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({ error: 'Failed to fetch tracks from hash' })
          );
          return;
        }

        const { result } = await response.json();
        const tracks = result.map((track: string) => JSON.parse(track));

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(tracks));
      } catch (error) {
        console.error('Error fetching tracks from KV:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to fetch tracks' }));
      }
    })();
  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const authHeader =
          req.headers['authorization'] || req.headers['Authorization'];
        await verifySpotifyUser(authHeader);

        const newTracks = JSON.parse(body) as any[];

        const pipeline = newTracks.map((track) => [
          'HSET',
          'tracks:timeout:hash',
          track.id,
          JSON.stringify(track),
        ]);

        if (pipeline.length > 0) {
          await fetch(`${process.env.KV_REST_API_URL}/pipeline`, {
            headers: {
              Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
            },
            body: JSON.stringify(pipeline),
            method: 'POST',
          });
        }

        console.log('Tracks updated successfully:', newTracks);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Tracks updated successfully' }));
      } catch (error: any) {
        if (error.message === 'No Authorization header provided' || error.message === 'Failed to verify Spotify user') {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Unauthorized' }));
        } else {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      }
    });
  } else if (req.method === 'DELETE') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const authHeader =
          req.headers['authorization'] || req.headers['Authorization'];
        await verifySpotifyUser(authHeader);

        const tracksToDelete = JSON.parse(body) as any[];

        const trackIdsToDelete = tracksToDelete.map((track) => track.id);
        if (trackIdsToDelete.length > 0) {
          await fetch(`${process.env.KV_REST_API_URL}`, {
            headers: {
              Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
            },
            body: JSON.stringify(['HDEL', 'tracks:timeout:hash', ...trackIdsToDelete]),
            method: 'POST',
          });
        }

        console.log('Tracks deleted successfully:', tracksToDelete);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Tracks deleted successfully' }));
      } catch (error: any) {
        if (error.message === 'No Authorization header provided' || error.message === 'Failed to verify Spotify user') {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Unauthorized' }));
        } else {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      }
    });
  } else {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST, DELETE');
    res.end('Method Not Allowed');
  }
}

module.exports = handler;
