// OpenAPI 3.1 description of the public API.
const Err = { type: "object", properties: { error: { type: "string" }, message: { type: "string" } }, required: ["error", "message"] };
const Result = {
  type: "object",
  properties: {
    id: { type: "integer" }, type: { type: "string", enum: ["profile", "account", "record", "lead"] }, entity_type: { type: "string" },
    platform: { type: ["string", "null"] }, category: { type: ["string", "null"] }, value: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 }, source: { type: "string" }, metadata: { type: "object" }, created_at: { type: "string", format: "date-time" },
  },
};
const Progress = { type: "object", properties: { modules_total: { type: "integer" }, modules_completed: { type: "integer" }, modules_with_hits: { type: "integer" }, modules_failed: { type: "integer" } } };
const Run = {
  type: "object",
  properties: {
    run_id: { type: "string", format: "uuid" }, status: { type: "string", enum: ["running", "completed", "failed"] }, type: { type: "string" }, query: { type: "string" },
    deep: { type: "boolean" }, total_results: { type: "integer" }, results: { type: "array", items: Result }, progress: Progress,
    results_purged_at: { type: ["string", "null"] }, created_at: { type: "string" }, completed_at: { type: ["string", "null"] },
  },
};
const errors = {
  "400": { description: "Invalid request", content: { "application/json": { schema: Err } } },
  "401": { description: "Invalid API key", content: { "application/json": { schema: Err } } },
  "429": { description: "Rate limited", content: { "application/json": { schema: Err } } },
};

export const openapi = {
  openapi: "3.1.0",
  info: { title: "Search API", version: "1.0.0", description: "Username, email and domain OSINT searches. Free. Findings are deleted 6 hours after a search." },
  components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" }, apiKey: { type: "apiKey", in: "header", name: "X-API-Key" } }, schemas: { Error: Err, Result, Run, Progress } },
  security: [{ bearer: [] }, { apiKey: [] }],
  paths: {
    "/v1/searches": {
      post: {
        summary: "Start a search",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["type", "query"], properties: {
          type: { type: "string", enum: ["username", "email", "domain"] }, query: { type: "string" }, deep: { type: "boolean" }, wait: { type: "boolean" }, stream: { type: "boolean" },
        } } } } },
        responses: { "200": { description: "Started (or finished, with wait)", content: { "application/json": { schema: Run }, "text/event-stream": { schema: { type: "string" } } } }, ...errors },
      },
      get: { summary: "List recent searches", parameters: [{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } }], responses: { "200": { description: "Runs" }, ...errors } },
    },
    "/v1/searches/{id}": { get: { summary: "Get a search", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Run", content: { "application/json": { schema: Run } } }, "404": { description: "Not found" }, ...errors } } },
    "/v1/searches/{id}/stream": { get: { summary: "Stream a search (SSE)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "text/event-stream of run, result, progress, done, reconnect, error" } } } },
    "/v1/me": { get: { summary: "Check your key", responses: { "200": { description: "Account" }, ...errors } } },
    "/v1/health": { get: { summary: "Service health", security: [], responses: { "200": { description: "Health" } } } },
    "/v1/capabilities": { get: { summary: "Machine-readable contract", security: [], responses: { "200": { description: "Capabilities" } } } },
  },
};
