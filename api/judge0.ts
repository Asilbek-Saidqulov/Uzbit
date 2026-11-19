/**
 * Server-side proxy to Judge0 on RapidAPI. The browser posts here; this function adds the
 * RapidAPI key, so the key never reaches the browser.
 *
 * Server environment variables (set in Vercel, not in .env files):
 *   JUDGE0_RAPIDAPI_KEY   your RapidAPI key
 *   JUDGE0_RAPIDAPI_HOST  the host shown on the Judge0 CE page, e.g. judge0-ce.p.rapidapi.com
 */
import { checkProxyRequest, MAX_BODY_CHARS } from '../src/judge/engine/proxyRules';

export const config = { runtime: 'edge' };

/** How long to keep polling for a finished result before giving up. */
const POLL_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 500;
/** Judge0 status ids 1 (In Queue) and 2 (Processing) mean the run is not finished yet. */
const UNFINISHED = (id: number | undefined) => id === undefined || id <= 2;

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' });

  const key = process.env.JUDGE0_RAPIDAPI_KEY?.trim();
  const host = process.env.JUDGE0_RAPIDAPI_HOST?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!key || !host) return json(500, { error: 'The judge service is not configured on the server.' });

  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) return json(413, { error: 'Request too large.' });

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return json(400, { error: 'Body must be JSON.' });
  }
  const checked = checkProxyRequest(parsed);
  if (!checked.ok) return json(400, { error: checked.error });

  const base = `https://${host}`;
  const auth = { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host };

  try {
    // 1. Create the submission. RapidAPI may answer before the program has finished.
    const created = await fetch(`${base}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(checked.value),
    });
    if (!created.ok) return json(created.status, { error: `Judge service returned HTTP ${created.status}.` });

    let result: any = await created.json();

    // 2. If it is still queued or running, poll the token until it finishes or we run out of time.
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (result?.token && UNFINISHED(result?.status?.id) && Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const polled = await fetch(`${base}/submissions/${result.token}?base64_encoded=false&fields=*`, {
        headers: auth,
      });
      if (!polled.ok) return json(polled.status, { error: `Judge service returned HTTP ${polled.status}.` });
      result = await polled.json();
    }

    return json(200, result);
  } catch (err) {
    console.error('judge0 proxy failed:', err);
    return json(502, { error: 'The judge service could not be reached.' });
  }
}
