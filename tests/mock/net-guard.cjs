// Loaded into the app under test with NODE_OPTIONS=--require. Any attempt to reach
// a host other than this machine fails, so a misconfigured test can't touch the real
// Supabase project, n8n, Google or a mailbox. Google Fonts is the one exception:
// `next build` downloads the site's fonts and they carry no project data.
const dns = require("node:dns");
const fs = require("node:fs");

const ALLOWED = new Set(["localhost", "127.0.0.1", "::1", "fonts.googleapis.com", "fonts.gstatic.com"]);

const blocked = (host) => {
  try {
    fs.mkdirSync(".next-test", { recursive: true });
    fs.appendFileSync(".next-test/net-guard.log", `${host}\n`);
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
