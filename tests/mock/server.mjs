// A local stand-in for Supabase (Auth, PostgREST, Storage) and the n8n webhooks.
//
// The browser tests run the real app against THIS server, so no test can read or
// write the real database, the Pilot sheet or a real mailbox. All data lives in
// memory, is rebuilt from seed.mjs on every start, and vanishes when it stops.
//
// Test-only helpers:  GET /__state?table=x   POST /__reset   GET /__webhooks
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { buildSeed } from "./seed.mjs";

const PORT = Number(process.env.MOCK_PORT ?? 4329);
export const WEBHOOK_SECRET = "test-webhook-secret";

let db, users, files, webhooks, nextId;
const failing = new Set();

function reset() {
  const seed = buildSeed();
  db = seed.tables;
  users = seed.users;
  files = new Map();
  webhooks = [];
  nextId = 100000;
}
reset();

// ---------------------------------------------------------------- tokens
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sessions = new Map(); // refresh token -> user id

function sessionFor(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access_token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp })}.mock`;
  const refresh_token = randomUUID();
  sessions.set(refresh_token, user.id);
  return { access_token, refresh_token, token_type: "bearer", expires_in: 3600, expires_at: exp, user: publicUser(user) };
}

function publicUser(u) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    app_metadata: u.app_metadata ?? {},
    user_metadata: u.user_metadata ?? {},
    created_at: "2026-01-01T00:00:00Z",
  };
}

function userFromRequest(req) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(part, "base64url").toString());
    if (exp * 1000 < Date.now()) return null;
    return users.find((u) => u.id === sub) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- PostgREST filters
function parseValue(raw) {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

function compare(a, b) {
  if (a === null || a === undefined) return null;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && b !== "") return na - nb;
  const da = Date.parse(a);
  const db_ = Date.parse(b);
  if (!Number.isNaN(da) && !Number.isNaN(db_)) return da - db_;
  return String(a).localeCompare(String(b));
}

function test(row, col, expr) {
  let neg = false;
  let e = expr;
  if (e.startsWith("not.")) {
    neg = true;
    e = e.slice(4);
  }
  const i = e.indexOf(".");
  const op = e.slice(0, i);
  const raw = e.slice(i + 1);
  const v = row[col];
  let ok;
  switch (op) {
    case "eq": ok = v !== null && v !== undefined && String(v) === String(parseValue(raw)); break;
    case "neq": ok = v !== null && v !== undefined && String(v) !== String(parseValue(raw)); break;
    case "is": ok = parseValue(raw) === null ? v === null || v === undefined : v === parseValue(raw); break;
    case "gt": ok = compare(v, raw) !== null && compare(v, raw) > 0; break;
    case "gte": ok = compare(v, raw) !== null && compare(v, raw) >= 0; break;
    case "lt": ok = compare(v, raw) !== null && compare(v, raw) < 0; break;
    case "lte": ok = compare(v, raw) !== null && compare(v, raw) <= 0; break;
    case "in": {
      const list = raw.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      ok = v !== null && v !== undefined && list.includes(String(v));
      break;
    }
    case "like":
    case "ilike": {
      const re = new RegExp(`^${raw.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/[%*]/g, ".*")}$`, op === "ilike" ? "i" : "");
      ok = v !== null && v !== undefined && re.test(String(v));
      break;
    }
    default:
      throw new Error(`mock: unsupported operator ${op}`);
  }
  return neg ? !ok : ok;
}

function splitOr(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const c of s) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function filterRows(table, params) {
  let rows = db[table] ?? [];
  for (const [k, v] of params) {
    if (RESERVED.has(k)) continue;
    if (k === "or") {
      const parts = splitOr(v.replace(/^\(|\)$/g, ""));
      rows = rows.filter((r) =>
        parts.some((p) => {
          const i = p.indexOf(".");
          return test(r, p.slice(0, i), p.slice(i + 1));
        }),
      );
    } else {
      rows = rows.filter((r) => test(r, k, v));
    }
  }
  return rows;
}

// ---------------------------------------------------------------- select + embeds
function splitColumns(s) {
  return splitOr(s.replace(/\s+/g, ""));
}

function singular(t) {
  return t.endsWith("ies") ? `${t.slice(0, -3)}y` : t.replace(/s$/, "");
}

function project(row, table, select) {
  if (!select || select === "*") return { ...row };
  const out = {};
  for (const col of splitColumns(select)) {
    const m = col.match(/^(?:([a-zA-Z_]+):)?([a-zA-Z_]+)(?:![a-zA-Z_]+)?\((.*)\)$/);
    if (m) {
      const [, alias, target, inner] = m;
      const fk = `${singular(target)}_id`;
      if (fk in row) {
        const hit = (db[target] ?? []).find((t) => t.id === row[fk]);
        out[alias ?? target] = hit ? project(hit, target, inner) : null;
      } else {
        const back = `${singular(table)}_id`;
        out[alias ?? target] = (db[target] ?? []).filter((t) => t[back] === row.id).map((t) => project(t, target, inner));
      }
    } else if (col === "*") {
      Object.assign(out, row);
    } else {
      const [alias, name] = col.includes(":") ? col.split(":") : [col, col];
      out[alias] = row[name] ?? null;
    }
  }
  return out;
}

function sortRows(rows, order) {
  if (!order) return rows;
  const keys = order.split(",").map((o) => {
    const [col, ...mods] = o.split(".");
    return { col, desc: mods.includes("desc"), nullsFirst: mods.includes("nullsfirst") };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc, nullsFirst } of keys) {
      const av = a[col] ?? null;
      const bv = b[col] ?? null;
      if (av === null && bv === null) continue;
      if (av === null) return nullsFirst ? -1 : 1;
      if (bv === null) return nullsFirst ? 1 : -1;
      const c = compare(av, bv);
      if (c) return desc ? -c : c;
    }
    return 0;
  });
}

// ---------------------------------------------------------------- PostgREST handler
function rest(req, url, body, res) {
  const table = decodeURIComponent(url.pathname.split("/")[3]);
  const params = [...url.searchParams.entries()];
  const select = url.searchParams.get("select");
  const prefer = req.headers.prefer ?? "";
  const accept = req.headers.accept ?? "";

  if (!(table in db)) {
    return send(res, 404, { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` });
  }

  const reply = (rows, status, total) => {
    const headers = {};
    if (prefer.includes("count=exact")) {
      headers["content-range"] = `${rows.length ? `0-${rows.length - 1}` : "*"}/${total ?? rows.length}`;
    }
    if (req.method === "HEAD") return send(res, 200, null, headers);
    if (accept.includes("vnd.pgrst.object")) {
      if (rows.length !== 1) {
        return send(res, 406, { code: "PGRST116", message: `JSON object requested, ${rows.length} rows returned`, details: "", hint: null }, headers);
      }
      return send(res, status, rows[0], headers);
    }
    return send(res, status, rows, headers);
  };

  if (req.method === "GET" || req.method === "HEAD") {
    const filtered = sortRows(filterRows(table, params), url.searchParams.get("order"));
    const off = Number(url.searchParams.get("offset") ?? 0);
    const lim = url.searchParams.get("limit");
    const page = lim === null ? filtered.slice(off) : filtered.slice(off, off + Number(lim));
    return reply(page.map((r) => project(r, table, select)), 200, filtered.length);
  }

  if (req.method === "POST") {
    const incoming = Array.isArray(body) ? body : [body];
    const conflict = url.searchParams.get("on_conflict")?.split(",");
    const merge = prefer.includes("resolution=merge-duplicates");
    const saved = incoming.map((raw) => {
      if (merge && conflict) {
        const hit = db[table].find((r) => conflict.every((c) => String(r[c]) === String(raw[c])));
        if (hit) return Object.assign(hit, raw);
      }
      const row = { id: raw.id ?? nextId++, created_at: new Date().toISOString(), ...raw };
      db[table].push(row);
      return row;
    });
    return prefer.includes("return=representation") ? reply(saved.map((r) => project(r, table, select)), 201) : send(res, 201, null);
  }

  if (req.method === "PATCH") {
    const hit = filterRows(table, params);
    hit.forEach((r) => Object.assign(r, body));
    return prefer.includes("return=representation") ? reply(hit.map((r) => project(r, table, select)), 200) : send(res, 204, null);
  }

  if (req.method === "DELETE") {
    const hit = new Set(filterRows(table, params));
    db[table] = db[table].filter((r) => !hit.has(r));
    return prefer.includes("return=representation") ? reply([...hit].map((r) => project(r, table, select)), 200) : send(res, 204, null);
  }

  return send(res, 405, { message: "method not allowed" });
}

// ---------------------------------------------------------------- Auth handler
function auth(req, url, body, res) {
  const path = url.pathname.replace("/auth/v1", "");

  if (path === "/token" && req.method === "POST") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const user = users.find((u) => u.email === String(body.email).toLowerCase() && u.password === body.password);
      if (!user) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      return send(res, 200, sessionFor(user));
    }
    if (grant === "refresh_token") {
      const user = users.find((u) => u.id === sessions.get(body.refresh_token));
      if (!user) return send(res, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
      return send(res, 200, sessionFor(user));
    }
  }

  if (path === "/user") {
    const user = userFromRequest(req);
    if (!user) return send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    if (req.method === "PUT") {
      if (body.password) user.password = body.password;
      if (body.data) user.user_metadata = { ...user.user_metadata, ...body.data };
    }
    return send(res, 200, publicUser(user));
  }

  if (path === "/logout") return send(res, 204, null);
  if (path === "/recover") {
    webhooks.push({ kind: "password-recovery", email: body.email });
    return send(res, 200, {});
  }

  const adminUser = path.match(/^\/admin\/users\/([^/]+)$/);
  if (adminUser) {
    const user = users.find((u) => u.id === adminUser[1]);
    if (!user) return send(res, 404, { code: 404, msg: "User not found" });
    if (req.method === "PUT") {
      if (body.password) user.password = body.password;
      if (body.app_metadata) user.app_metadata = body.app_metadata;
      if (body.user_metadata) user.user_metadata = body.user_metadata;
    }
    return send(res, 200, publicUser(user));
  }
  if (path === "/admin/users" && req.method === "GET") {
    return send(res, 200, { users: users.map(publicUser), aud: "authenticated" });
  }

  return send(res, 404, { msg: `mock auth: no route for ${req.method} ${path}` });
}

// ---------------------------------------------------------------- Storage handler
function storage(req, url, rawBody, res) {
  const path = decodeURIComponent(url.pathname.replace("/storage/v1/object/", ""));
  if (req.method === "DELETE") {
    const bucket = path.replace(/\/$/, "");
    const prefixes = JSON.parse(rawBody.toString() || "{}").prefixes ?? [];
    prefixes.forEach((p) => files.delete(`${bucket}/${p}`));
    return send(res, 200, prefixes.map((name) => ({ name })));
  }
  if (req.method === "POST" || req.method === "PUT") {
    let bytes = rawBody;
    let contentType = req.headers["content-type"] ?? "application/octet-stream";
    // supabase-js sends Blob/File uploads as multipart form data.
    const boundary = contentType.match(/boundary=(.+)$/)?.[1];
    if (boundary) {
      const start = rawBody.indexOf("\r\n\r\n", rawBody.indexOf(`name=""`)) + 4;
      const end = rawBody.indexOf(`\r\n--${boundary}`, start);
      const head = rawBody.subarray(0, start).toString();
      bytes = rawBody.subarray(start, end);
      contentType = head.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] ?? contentType;
    }
    files.set(path, { bytes, contentType });
    return send(res, 200, { Key: path, Id: randomUUID() });
  }
  if (req.method === "GET") {
    const f = files.get(path);
    if (!f) return send(res, 404, { statusCode: "404", error: "not_found", message: "Object not found" });
    res.writeHead(200, { "content-type": f.contentType });
    return res.end(f.bytes);
  }
  return send(res, 405, {});
}

// ---------------------------------------------------------------- n8n webhooks
function n8n(url, body, res) {
  const name = url.pathname.split("/").pop();
  webhooks.push({ kind: name, body });
  if (body.secret !== WEBHOOK_SECRET) return send(res, 401, { ok: false, error: "bad secret" });

  if (failing.has(name)) return send(res, 404, { code: 404, message: "The workflow must be active" });

  if (name === "broadcast") {
    // What the real ADMIN-BROADCAST does: mark each recipient and the broadcast as sent.
    for (const m of body.messages ?? []) {
      const r = db.email_broadcast_recipients.find((x) => x.id === m.recipient_id);
      if (r) Object.assign(r, { status: "sent", sent_at: new Date().toISOString() });
    }
    const b = db.email_broadcasts.find((x) => x.id === body.broadcast_id);
    if (b) Object.assign(b, { status: "sent", sent_count: body.messages?.length ?? 0 });
    return send(res, 200, { ok: true, accepted: body.messages?.length ?? 0 });
  }

  if (name === "contacts-sync") {
    db.contact_sync_runs.push({
      id: nextId++,
      ran_at: new Date().toISOString(),
      rows_read: db.startup_contacts.length,
      matched_startups: new Set(db.startup_contacts.map((c) => c.startup_id)).size,
      emails: db.startup_contacts.length,
      unmatched: [],
    });
    return send(res, 200, {
      ok: true,
      matched_startups: new Set(db.startup_contacts.map((c) => c.startup_id)).size,
      emails: db.startup_contacts.length,
      rows_read: db.startup_contacts.length,
    });
  }

  return send(res, 404, { ok: false, error: `no mock webhook ${name}` });
}

// ---------------------------------------------------------------- HTTP plumbing
function send(res, status, payload, headers = {}) {
  const body = payload === null || payload === undefined ? "" : JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(body);
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
  "access-control-expose-headers": "content-range",
};

createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const raw = Buffer.concat(chunks);
    let body = {};
    if ((req.headers["content-type"] ?? "").includes("json") && raw.length) {
      try {
        body = JSON.parse(raw.toString());
      } catch {
        return send(res, 400, { message: "bad json" });
      }
    }
    try {
      if (url.pathname === "/__health") return send(res, 200, { ok: true });
      if (url.pathname === "/__reset") {
        reset();
        return send(res, 200, { ok: true });
      }
      if (url.pathname === "/__fail") {
        const name = url.searchParams.get("webhook");
        if (url.searchParams.get("on") === "1") failing.add(name);
        else failing.delete(name);
        return send(res, 200, { failing: [...failing] });
      }
      if (url.pathname === "/__state") return send(res, 200, db[url.searchParams.get("table")] ?? null);
      if (url.pathname === "/__webhooks") return send(res, 200, webhooks);
      if (url.pathname === "/__users") {
        return send(res, 200, users.map((u) => ({ id: u.id, email: u.email, password: u.password, app_metadata: u.app_metadata })));
      }
      if (url.pathname.startsWith("/rest/v1/")) return rest(req, url, body, res);
      if (url.pathname.startsWith("/auth/v1/")) return auth(req, url, body, res);
      if (url.pathname.startsWith("/storage/v1/object/")) return storage(req, url, raw, res);
      if (url.pathname.startsWith("/webhook/")) return n8n(url, body, res);
      return send(res, 404, { message: `mock: no route for ${url.pathname}` });
    } catch (e) {
      return send(res, 500, { message: String(e?.message ?? e) });
    }
  });
}).listen(PORT, () => console.log(`mock supabase + n8n on :${PORT}`));
