const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('postman_collection.json', 'utf8'));

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'RentNest API',
    version: '1.0.0',
    description: collection.info.description.replace(/{{base_url}}/g, 'https://rentnest-api.vercel.app'),
  },
  servers: [{ url: 'https://rentnest-api.vercel.app/api', description: 'Production' }],
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: createSchemas(),
  },
};

function getMethod(item) {
  if (!item.request) return null;
  return item.request.method.toLowerCase();
}

function getPath(item) {
  if (!item.request || !item.request.url) return null;
  let raw = item.request.url.raw || '';
  raw = raw.replace(/{{base_url}}\/api/g, '').replace(/{{base_url}}/g, '');
  raw = raw.split('?')[0];
  if (!raw.startsWith('/')) raw = '/' + raw;
  return raw;
}

function getParams(item) {
  const params = [];
  const url = item.request?.url;
  if (!url) return params;
  
  const path = url.raw?.replace(/{{base_url}}\/api/g, '').replace(/{{base_url}}/g, '') || '';
  const pathParams = path.match(/\{\{(\w+)\}\}/g) || [];
  for (const p of pathParams) {
    params.push({ name: p.replace(/[{}]/g, ''), in: 'path', required: true, schema: { type: 'string' } });
  }
  
  if (url.query) {
    for (const q of url.query) {
      if (q.key) {
        params.push({ name: q.key, in: 'query', description: q.description || '', schema: { type: 'string' } });
      }
    }
  }
  
  return params;
}

function getRequestBody(item) {
  if (!item.request?.body?.raw) return null;
  try {
    const body = JSON.parse(item.request.body.raw);
    const resolvedBody = resolveVariables(body);
    return {
      required: true,
      content: { 'application/json': { schema: { type: 'object', properties: generateProperties(resolvedBody) } } },
    };
  } catch {
    return null;
  }
}

function resolveVariables(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{\w+\}\}/g, 'string');
  }
  if (Array.isArray(obj)) return obj.map(resolveVariables);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) result[k] = resolveVariables(v);
    return result;
  }
  return obj;
}

function generateProperties(obj) {
  const props = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') props[k] = { type: 'string', example: v === 'string' ? '<value>' : v };
    else if (typeof v === 'number') props[k] = { type: 'number', example: v };
    else if (typeof v === 'boolean') props[k] = { type: 'boolean', example: v };
    else if (Array.isArray(v)) {
      props[k] = { type: 'array', items: v.length > 0 && typeof v[0] === 'object' ? { type: 'object', properties: generateProperties(v[0]) } : { type: 'string' }, example: v };
    } else if (typeof v === 'object' && v !== null) {
      props[k] = { type: 'object', properties: generateProperties(v), example: v };
    }
  }
  return props;
}

function createSchemas() {
  return {
    ApiResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', nullable: true },
        errorDetails: { type: 'object', nullable: true },
        meta: { type: 'object', nullable: true, properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } },
      },
    },
  };
}

function getResponses(item) {
  const responses = {};
  if (item.response) {
    for (const resp of item.response) {
      const code = resp.code || 200;
      let schema = {};
      if (resp.body) {
        try {
          schema = { content: { 'application/json': { example: JSON.parse(resp.body) } } };
        } catch { schema = {}; }
      }
      responses[code] = { description: resp.name || resp.status || 'Response', ...schema };
    }
  }
  if (!responses['200'] && !responses['201']) {
    responses['200'] = { description: 'Successful response' };
  }
  responses['400'] = { description: 'Bad Request' };
  responses['401'] = { description: 'Unauthorized' };
  responses['403'] = { description: 'Forbidden' };
  responses['404'] = { description: 'Not Found' };
  responses['500'] = { description: 'Internal Server Error' };
  return responses;
}

function getTags(item) {
  if (item.name === 'Health') return ['Health'];
  return [item.name];
}

function processItems(items, parentTags) {
  for (const item of items) {
    if (item.item) {
      processItems(item.item, item.name ? [item.name] : parentTags);
    } else {
      const method = getMethod(item);
      const path = getPath(item);
      if (!method || !path) continue;
      
      if (!openapi.paths[path]) openapi.paths[path] = {};
      
      const security = item.request?.header?.some(h => h.key === 'Authorization')
        ? [{ bearerAuth: [] }]
        : [];
      
      openapi.paths[path][method] = {
        summary: item.name,
        description: item.request?.description || '',
        tags: getTags(item).length ? getTags(item) : parentTags || ['General'],
        parameters: getParams(item),
        requestBody: getRequestBody(item),
        security: security.length ? security : undefined,
        responses: getResponses(item),
      };
    }
  }
}

processItems(collection.item, ['General']);

fs.writeFileSync('api-docs/openapi.json', JSON.stringify(openapi, null, 2));
console.log('Converted! Total paths:', Object.keys(openapi.paths).length);
