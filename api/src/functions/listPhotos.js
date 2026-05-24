const { app }             = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

app.http('photos', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'photos',
  handler: async (req, context) => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: CORS };
    }

    try {
      const connStr       = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'photos';

      if (!connStr) {
        return {
          status: 200,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: [] }),
        };
      }

      const serviceClient   = BlobServiceClient.fromConnectionString(connStr);
      const containerClient = serviceClient.getContainerClient(containerName);

      // Container may not exist yet — return empty array in that case
      const exists = await containerClient.exists();
      if (!exists) {
        return {
          status: 200,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: [] }),
        };
      }

      const items = [];
      for await (const blob of containerClient.listBlobsFlat()) {
        items.push(`${serviceClient.url}${containerName}/${blob.name}`);
      }

      // Sort by the trailing number in the filename (e.g. Rayan_5.jpg → 5)
      const numOf = (url) => {
        const match = url.match(/_(\d+)\.[^.]+$/);
        return match ? parseInt(match[1], 10) : Infinity;
      };
      items.sort((a, b) => numOf(a) - numOf(b));

      return {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: items }),
      };
    } catch (err) {
      context.error('listPhotos error:', err);
      return {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: [] }),
      };
    }
  },
});
