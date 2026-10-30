// Loaded into the app under test with NODE_OPTIONS=--require. Any attempt to reach
// a host other than this machine fails, so a misconfigured test can't touch the real
// Supabase project, n8n, Google or a mailbox. It also proves a build needs no outside
// service, since the site's fonts now live in the repo.
const dns = require("node:dns");
const fs = require("node:fs");
const path = require("node:path");

// Resolved now because the standalone server changes directory when it starts.
const LOG = path.resolve(".next-test/net-guard.log");

const ALLOWED = new Set(["localhost", "127.0.0.1", "::1"]);

const blocked = (host) => {
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.appendFileSync(LOG, `${host}\n`);
  } catch {}
  const err = new Error(`net-guard: blocked connection to ${host} during tests`);
  err.code = "ENOTFOUND";
  return err;
};

const realLookup = dns.lookup;
dns.lookup = function lookup(host, options, callback) {
  const cb = typeof options === "function" ? options : callback;
  if (!ALLOWED.has(String(host))) {
    return process.nextTick(cb, blocked(host));
  }
  return realLookup.call(dns, host, options, callback);
};

const realPromise = dns.promises.lookup;
dns.promises.lookup = function lookup(host, options) {
  if (!ALLOWED.has(String(host))) {
    return Promise.reject(blocked(host));
  }
  return realPromise.call(dns.promises, host, options);
};
