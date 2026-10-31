// Loaded before every unit test. Anything that really tries the network fails here, so a test
// can't reach real Supabase or n8n even if it forgets to replace fetch. Tests that stub fetch
// are unaffected.
const realFetch = globalThis.fetch;

globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return Promise.reject(new Error(`Unit tests can't reach ${url.hostname}`));
  }
  return realFetch(input, init);
};
