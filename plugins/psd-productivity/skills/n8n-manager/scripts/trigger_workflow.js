#!/usr/bin/env bun

// Trigger a workflow via its webhook URL.
// Usage: bun trigger_workflow.js <webhook-url> [json-payload]
//
// The n8n REST API has no "execute workflow" endpoint.
// Workflows must have a Webhook trigger node to be triggered programmatically.
//
// Examples:
//   bun trigger_workflow.js https://<your-n8n-host>/webhook/abc123
//   bun trigger_workflow.js https://<your-n8n-host>/webhook/abc123 '{"name":"test"}'

const webhookUrl = process.argv[2];
if (!webhookUrl) {
  console.error(JSON.stringify({
    error: 'Webhook URL required. Usage: bun trigger_workflow.js <url> [json-payload]'
  }));
  process.exit(1);
}

let payload = {};
if (process.argv[3]) {
  try {
    payload = JSON.parse(process.argv[3]);
  } catch (e) {
    console.error(JSON.stringify({ error: `Invalid JSON payload: ${e.message}` }));
    process.exit(1);
  }
}

async function triggerWorkflow() {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let responseData;
  try {
    responseData = JSON.parse(text);
  } catch {
    responseData = text;
  }

  if (!response.ok) {
    return {
      triggered: false,
      status: response.status,
      error: responseData,
    };
  }

  return {
    triggered: true,
    status: response.status,
    response: responseData,
  };
}

try {
  const result = await triggerWorkflow();
  console.log(JSON.stringify(result, null, 2));
  if (!result.triggered) process.exit(1);
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
