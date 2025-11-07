import type {
  ApiCollection,
  ApiRequestDefinition,
  ApiResponseSnapshot,
  KeyValuePair,
} from '@shared/models/apiCollection';
import type { ApiCollectionsClient, ExecuteRequestPayload } from '../apiCollections';

const seedCollections: ApiCollection[] = [
  {
    id: 'col-auth',
    name: 'Auth & Session',
    description: 'Authentication, token refresh, and session inspection endpoints.',
    tags: ['auth', 'core'],
    requests: [
      {
        id: 'req-login',
        name: 'User Login',
        method: 'POST',
        url: '/auth/login',
        description: 'Exchange user credentials for a bearer token.',
        params: [],
        headers: [
          { id: 'h-json', key: 'Content-Type', value: 'application/json', enabled: true },
          { id: 'h-trace', key: 'X-Trace-Id', value: 'demo-trace', enabled: false },
        ],
        body: JSON.stringify({ username: 'demo@sosoman.dev', password: 'P@55w0rd' }, null, 2),
        tests: [
          {
            id: 'test-token',
            name: 'should return token',
            script: `vitest.expect(response.status).toBe(200);`,
          },
        ],
      },
      {
        id: 'req-refresh',
        name: 'Refresh Token',
        method: 'POST',
        url: '/auth/token/refresh',
        description: 'Refresh the access token using the refresh token cookie.',
        params: [],
        headers: [{ id: 'h-cookie', key: 'Cookie', value: 'sosoman_refresh=mock', enabled: true }],
        body: JSON.stringify({ grantType: 'refresh_token' }, null, 2),
        tests: [],
      },
    ],
  },
  {
    id: 'col-orders',
    name: 'Order lifecycle',
    description: 'Create, update, and cancel purchase orders.',
    tags: ['orders'],
    requests: [
      {
        id: 'req-create-order',
        name: 'Create Order',
        method: 'POST',
        url: '/orders',
        description: 'Create a brand new order with items and shipment details.',
        params: [
          { id: 'p-env', key: 'env', value: 'staging', enabled: true },
          { id: 'p-verbose', key: 'verbose', value: 'true', enabled: false },
        ],
        headers: [
          {
            id: 'h-auth',
            key: 'Authorization',
            value: 'Bearer <workspace-token>',
            enabled: true,
          },
        ],
        body: JSON.stringify(
          {
            currency: 'CNY',
            items: [
              { sku: 'tee-basic', qty: 1 },
              { sku: 'hoodie-warm', qty: 2 },
            ],
            shipping: { method: 'express' },
          },
          null,
          2
        ),
        tests: [
          {
            id: 'test-status',
            name: 'Status 201',
            script: `vitest.expect(response.status).toBe(201);`,
          },
        ],
      },
      {
        id: 'req-get-order',
        name: 'Get Order',
        method: 'GET',
        url: '/orders/:orderId',
        description: 'Fetch a specific order by ID.',
        params: [{ id: 'p-order-id', key: 'orderId', value: 'so-20231001', enabled: true }],
        headers: [{ id: 'h-auth2', key: 'Authorization', value: 'Bearer <workspace-token>', enabled: true }],
        body: '',
        tests: [],
      },
    ],
  },
];

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function cloneCollections(): ApiCollection[] {
  return JSON.parse(JSON.stringify(seedCollections));
}

function toHeaderPairs(headers: Record<string, string>): KeyValuePair[] {
  return Object.entries(headers).map(([key, value]) => ({
    id: `${key}-${value}`,
    key,
    value,
    enabled: true,
  }));
}

const pickStatus = (method: string): { status: number; statusText: string } => {
  if (method === 'POST') return { status: 201, statusText: 'Created' };
  if (method === 'DELETE') return { status: 204, statusText: 'No Content' };
  return { status: 200, statusText: 'OK' };
};

export class MockApiCollectionsClient implements ApiCollectionsClient {
  async listCollections(): Promise<ApiCollection[]> {
    console.info('[apiCollectionsMock] listing collections');
    // Clone to avoid accidental mutations leaking outside.
    return cloneCollections();
  }

  async executeRequest(payload: ExecuteRequestPayload): Promise<ApiResponseSnapshot> {
    const startedAt = new Date().toISOString();
    const durationMs = 200 + Math.round(Math.random() * 700);

    const { method, url, headers } = payload.request;
    console.info('[apiCollectionsMock] executing request', { method, url });

    await wait(durationMs);

    const responseBody = JSON.stringify(
      {
        ok: true,
        message: `Mocked response for ${method} ${url}`,
        echoedHeaders: headers.filter((header) => header.enabled),
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );

    const { status, statusText } = pickStatus(method);
    const sizeInBytes = new TextEncoder().encode(responseBody).length;

    return {
      id: `res-${Date.now()}`,
      requestId: payload.request.id,
      status,
      statusText,
      durationMs,
      sizeInBytes,
      headers: toHeaderPairs({
        'content-type': 'application/json',
        'x-mock-latency': `${durationMs}ms`,
      }),
      body: responseBody,
      consoleLog: [
        `[mock] Received payload at ${startedAt}`,
        `[mock] Request captured with method ${method}`,
        `[mock] Response returned in ${durationMs}ms`,
      ],
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }
}
