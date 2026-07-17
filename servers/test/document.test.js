const test = require('node:test');
const assert = require('node:assert');
const express = require('express');

// Set required environment variables for routes to initialize without errors
process.env.SERVICE_TOKEN = 'test-token';
process.env.JWT_SECRET = 'test-jwt';
process.env.SESSION_SECRET = 'test-session';

// Mock middlewares before loading the router
require('../middlewares/auth');
require('../middlewares/csrf');

require.cache[require.resolve('../middlewares/auth')] = {
  exports: {
    verifyToken: (req, res, next) => {
      req.userId = 'user123';
      next();
    },
    ensureActive: (req, res, next) => next()
  }
};

require.cache[require.resolve('../middlewares/csrf')] = {
  exports: {
    verifyCsrf: (req, res, next) => next()
  }
};

const Document = require('../models/Document');
const DocChunk = require('../models/DocChunk');
const documentRouter = require('../routes/document');

test('POST /:id/index-state/building route tests', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/document', documentRouter);

  const originalFindOneAndUpdate = Document.findOneAndUpdate;
  const originalFindById = Document.findById;
  const originalCountDocuments = DocChunk.countDocuments;

  t.afterEach(() => {
    Document.findOneAndUpdate = originalFindOneAndUpdate;
    Document.findById = originalFindById;
    DocChunk.countDocuments = originalCountDocuments;
  });

  await t.test('Legacy document with undefined indexState - should succeed and set build state', async () => {
    let capturedQuery, capturedUpdate, capturedOptions;

    Document.findOneAndUpdate = async (query, update, options) => {
      capturedQuery = query;
      capturedUpdate = update;
      capturedOptions = options;

      return {
        _id: query._id,
        indexState: {
          activeVersion: null,
          previousVersion: null,
          activeMetadata: {
            fileHash: null,
            pipelineVersion: null,
            chunkingVersion: null,
            embeddingModel: null
          },
          build: {
            version: update.$set['indexState.build'].version,
            status: 'building',
            fileHash: null,
            pipelineVersion: null,
            chunkingVersion: null,
            embeddingModel: null,
            reason: null
          }
        }
      };
    };

    const server = app.listen(0);
    const { port } = server.address();
    try {
      const response = await fetch(`http://localhost:${port}/api/document/doc_legacy/index-state/building`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-token': 'test-token'
        },
        body: JSON.stringify({
          indexVersion: 'requested-uuid-123'
        })
      });
      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.indexState.build.status, 'building');
      assert.strictEqual(data.indexState.build.version, 'requested-uuid-123');

      assert.strictEqual(capturedQuery._id, 'doc_legacy');
      assert.deepStrictEqual(capturedUpdate.$set['indexState.build'], {
        version: 'requested-uuid-123',
        status: 'building',
        fileHash: null,
        pipelineVersion: null,
        chunkingVersion: null,
        embeddingModel: null,
        reason: null
      });
    } finally {
      server.close();
    }
  });

  await t.test('Document with existing activeVersion - should preserve existing active state and update build state', async () => {
    let capturedQuery, capturedUpdate;

    Document.findOneAndUpdate = async (query, update, options) => {
      capturedQuery = query;
      capturedUpdate = update;

      return {
        _id: query._id,
        indexState: {
          activeVersion: 'active-v99',
          previousVersion: null,
          activeMetadata: {
            fileHash: 'hash-99',
            pipelineVersion: '6',
            chunkingVersion: '3',
            embeddingModel: 'gemini'
          },
          build: {
            version: 'new-build-uuid',
            status: 'building',
            fileHash: null,
            pipelineVersion: null,
            chunkingVersion: null,
            embeddingModel: null,
            reason: null
          }
        }
      };
    };

    const server = app.listen(0);
    const { port } = server.address();
    try {
      const response = await fetch(`http://localhost:${port}/api/document/doc_active/index-state/building`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-token': 'test-token'
        },
        body: JSON.stringify({
          indexVersion: 'new-build-uuid'
        })
      });
      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.indexState.activeVersion, 'active-v99');
      assert.strictEqual(data.indexState.build.status, 'building');
      assert.strictEqual(data.indexState.build.version, 'new-build-uuid');

      assert.strictEqual(capturedQuery._id, 'doc_active');
      assert.deepStrictEqual(capturedUpdate.$set['indexState.build'], {
        version: 'new-build-uuid',
        status: 'building',
        fileHash: null,
        pipelineVersion: null,
        chunkingVersion: null,
        embeddingModel: null,
        reason: null
      });
    } finally {
      server.close();
    }
  });

  await t.test('Another index build in progress - should return 409 Conflict', async () => {
    Document.findOneAndUpdate = async () => null; // Simulate CAS condition failure
    Document.findById = async (id) => ({ _id: id }); // Document exists

    const server = app.listen(0);
    const { port } = server.address();
    try {
      const response = await fetch(`http://localhost:${port}/api/document/doc_conflict/index-state/building`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-token': 'test-token'
        },
        body: JSON.stringify({
          indexVersion: 'new-build-uuid'
        })
      });
      assert.strictEqual(response.status, 409);
      const data = await response.json();
      assert.strictEqual(data.message, 'Another index build is already in progress');
    } finally {
      server.close();
    }
  });

  await t.test('GET /:id/chunks/count - should succeed and return count', async () => {
    let capturedQuery;
    DocChunk.countDocuments = async (query) => {
      capturedQuery = query;
      return 42;
    };

    const server = app.listen(0);
    const { port } = server.address();
    try {
      const response = await fetch(`http://localhost:${port}/api/document/doc_count/chunks/count?indexVersion=v_test`, {
        method: 'GET',
        headers: {
          'x-service-token': 'test-token'
        }
      });
      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.count, 42);
      assert.deepStrictEqual(capturedQuery, { doc: 'doc_count', indexVersion: 'v_test' });
    } finally {
      server.close();
    }
  });

  await t.test('DELETE /:id - should succeed and delete document, chat, and chunks', async () => {
    let docDeleted = false;
    let chatDeleted = false;
    let chunksDeleted = false;

    Document.findOneAndDelete = async (query) => {
      assert.deepStrictEqual(query, { _id: 'doc123', user: 'user123' });
      docDeleted = true;
      return { _id: 'doc123', user: 'user123' };
    };

    const Chat = require('../models/Chat');
    const originalChatFindOneAndDelete = Chat.findOneAndDelete;
    Chat.findOneAndDelete = async (query) => {
      assert.deepStrictEqual(query, { user: 'user123', document: 'doc123' });
      chatDeleted = true;
      return { _id: 'chat123', messages: [] };
    };

    const DocChunk = require('../models/DocChunk');
    const originalDocChunkDeleteMany = DocChunk.deleteMany;
    DocChunk.deleteMany = async (query) => {
      assert.deepStrictEqual(query, { doc: 'doc123' });
      chunksDeleted = true;
      return { deletedCount: 5 };
    };

    const server = app.listen(0);
    const { port } = server.address();
    try {
      const response = await fetch(`http://localhost:${port}/api/document/doc123`, {
        method: 'DELETE'
      });
      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.message, 'Document deleted');
      assert.ok(docDeleted);
      assert.ok(chatDeleted);
      assert.ok(chunksDeleted);
    } finally {
      Chat.findOneAndDelete = originalChatFindOneAndDelete;
      DocChunk.deleteMany = originalDocChunkDeleteMany;
      server.close();
    }
  });
});
