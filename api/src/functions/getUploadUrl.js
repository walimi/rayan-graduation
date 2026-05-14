const { app }             = require('@azure/functions');
const { BlobServiceClient, BlobSASPermissions } = require('@azure/storage-blob');
const { v4: uuidv4 }      = require('uuid');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

app.http('get-upload-url', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'get-upload-url',
  handler: async (req, context) => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: CORS };
    }

    try {
      const body = await req.json();
      const { filename, contentType } = body || {};

      if (!filename || !contentType) {
        return {
          status: 400,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'filename and contentType are required' }),
        };
      }

      const connStr       = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'photos';

      if (!connStr) {
        context.warn('AZURE_STORAGE_CONNECTION_STRING not set');
        return {
          status: 503,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Storage not configured' }),
        };
      }

      const ext           = (filename.split('.').pop() || 'jpg').toLowerCase();
      const blobName      = `${uuidv4()}.${ext}`;
      const serviceClient = BlobServiceClient.fromConnectionString(connStr);
      const containerClient = serviceClient.getContainerClient(containerName);

      // Ensure container exists with public blob read access
      await containerClient.createIfNotExists({ access: 'blob' });

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // SAS valid for 10 minutes — write only
      const uploadUrl = await blockBlobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse('cw'),
        expiresOn:   new Date(Date.now() + 10 * 60 * 1000),
        contentType,
      });

      return {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadUrl, blobName }),
      };
    } catch (err) {
      context.error('getUploadUrl error:', err);
      return {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal server error' }),
      };
    }
  },
});
