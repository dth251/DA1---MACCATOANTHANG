'use strict';
// Dependency-free Node.js server: storefront + authenticated customer-request inbox.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const catalog = require('./catalog.json');
const STATUS = ['new', 'processing', 'completed', 'rejected'];
const TOPICS = {
  contact: { general: 'Thông tin sản phẩm', order: 'Hỗ trợ đơn hàng', partnership: 'Hợp tác / phân phối', feedback: 'Góp ý khác' },
  consult: { personal: 'Sản phẩm dùng cá nhân / gia đình', gift: 'Quà tặng cá nhân / doanh nghiệp', wholesale: 'Đơn hàng số lượng lớn / đại lý', other: 'Nhu cầu khác' },
};
function failure(status, message) { return Object.assign(new Error(message), { status }); }
function string(value, name, min = 0, max = 2000) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw failure(400, `${name} không hợp lệ.`);
  return value.trim();
}
function normalizeRequest(body) {
  if (!body || !['contact', 'consult', 'order'].includes(body.type) || body.consent !== true) throw failure(400, 'Vui lòng xác nhận gửi thông tin đến cửa hàng.');
  const source = body.customer || {};
  const customer = {
    name: string(source.name, 'Họ tên', 2, 100),
    email: string(source.email || '', 'Email', body.type === 'contact' ? 3 : 0, 150),
    phone: string(source.phone || '', 'Số điện thoại', body.type === 'contact' ? 0 : 9, 20).replace(/\s/g, ''),
  };
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw failure(400, 'Email không hợp lệ.');
  if (customer.phone && !/^\+?\d{9,15}$/.test(customer.phone)) throw failure(400, 'Số điện thoại cần có 9–15 chữ số.');
  if (body.type === 'order') {
    customer.address = string(source.address, 'Địa chỉ', 5, 250);
    customer.ward = string(source.ward, 'Phường / xã', 1, 100);
    customer.province = string(source.province, 'Tỉnh / thành phố', 1, 100);
    if (body.payment !== 'cod' || !['standard', 'express'].includes(body.shipping)) throw failure(400, 'Phương thức thanh toán hoặc giao hàng không khả dụng.');
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw failure(400, 'Giỏ hàng không hợp lệ.');
    const quantities = new Map();
    for (const item of body.items) {
      if (!item || !catalog.some(p => p.id === item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw failure(400, 'Sản phẩm hoặc số lượng không hợp lệ.');
      quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
    }
    const items = [...quantities].map(([id, quantity]) => {
      if (quantity > 99) throw failure(400, 'Số lượng mỗi sản phẩm tối đa 99.');
      return { ...catalog.find(p => p.id === id), quantity };
    });
    const shippingFee = body.shipping === 'express' ? 45000 : 30000;
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, shippingFee);
    if (body.expectedTotal !== total) throw failure(409, 'Giá sản phẩm đã thay đổi. Vui lòng tải lại trang và kiểm tra tổng tiền trước khi gửi.');
    return { type: 'order', customer, topic: 'Yêu cầu đặt hàng', message: string(body.message || '', 'Ghi chú', 0, 1000), items, payment: 'cod', shipping: body.shipping, shippingFee, total };
  }
  if (!Object.hasOwn(TOPICS[body.type], body.topic)) throw failure(400, 'Chủ đề không hợp lệ.');
  const record = { type: body.type, customer, topic: TOPICS[body.type][body.topic], message: string(body.message, 'Nội dung', 10, 2000) };
  if (body.type === 'consult') {
    const details = body.details || {};
    if (details.quantity !== null && (!Number.isInteger(details.quantity) || details.quantity < 1 || details.quantity > 100000)) throw failure(400, 'Số lượng dự kiến không hợp lệ.');
    record.details = { company: string(details.company || '', 'Tên doanh nghiệp', 0, 150), quantity: details.quantity, budget: string(details.budget || '', 'Ngân sách', 0, 100) };
  }
  return record;
}
function publicRecord(record) { const { tokenHash, payloadHash, ...visible } = record; return visible; }
async function createApp(options) {
  if (!options || typeof options.adminPassword !== 'string' || options.adminPassword.length < 12) throw new Error('Cần ADMIN_PASSWORD tối thiểu 12 ký tự.');
  const username = options.adminUsername || 'admin';
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const dataDir = path.resolve(options.dataDir || path.join(root, '.admin-data'));
  const recordFile = path.join(dataDir, 'requests.json');
  await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
  let records;
  try {
    records = JSON.parse(await fs.readFile(recordFile, 'utf8'));
    if (!Array.isArray(records) || records.some(r => !r || typeof r.id !== 'string' || !STATUS.includes(r.status) || !r.customer || !Number.isInteger(r.revision))) throw Error('invalid');
  } catch (error) {
    if (error.code === 'ENOENT') records = [];
    else throw new Error('Không đọc được dữ liệu yêu cầu. Dừng máy chủ để tránh ghi đè dữ liệu.');
  }
  const salt = crypto.randomBytes(16);
  const passwordHash = await scrypt(options.adminPassword, salt, 64);
  const sessions = new Map(), limits = new Map();
  let pendingWrite = Promise.resolve();
  function serial(action) {
    const result = pendingWrite.then(action);
    pendingWrite = result.catch(() => {});
    return result;
  }
  async function persist(next) {
    const temp = recordFile + '.' + crypto.randomUUID() + '.tmp';
    try {
      await fs.writeFile(temp, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
      await fs.rename(temp, recordFile);
      records = next;
    } catch (error) {
      await fs.unlink(temp).catch(() => {});
      throw failure(503, 'Chưa lưu được yêu cầu. Vui lòng thử lại sau.');
    }
  }
  function limit(key, count, windowMs) {
    const now = Date.now();
    for (const [id, bucket] of limits) if (bucket.until <= now) limits.delete(id);
    let bucket = limits.get(key);
    if (!bucket) { bucket = { count: 0, until: now + windowMs }; limits.set(key, bucket); }
    if (++bucket.count > count) throw failure(429, 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau vài phút.');
  }
  function json(res, status, body, extra = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
    res.end(JSON.stringify(body));
  }
  async function readBody(req) {
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw failure(415, 'Yêu cầu phải có định dạng JSON.');
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 32768) throw failure(413, 'Nội dung gửi quá dài.');
      chunks.push(chunk);
    }
    try {
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid');
      return data;
    } catch { throw failure(400, 'Nội dung gửi không hợp lệ.'); }
  }
  function session(req) {
    const token = /(?:^|;\s*)macca_admin=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    const entry = sessions.get(token);
    if (!entry || entry.expires < Date.now()) { if (token) sessions.delete(token); throw failure(401, 'Vui lòng đăng nhập tài khoản admin.'); }
    return token;
  }
  function sameOrigin(req) {
    const origin = options.publicOrigin || `${options.secureCookies ? 'https' : 'http'}://${req.headers.host}`;
    if ((req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') throw failure(403, 'Nguồn gửi yêu cầu không hợp lệ.');
  }
  const cookie = (token, maxAge) => `macca_admin=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${options.secureCookies ? '; Secure' : ''}`;
  async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      if (route.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) sameOrigin(req);
        const ip = req.socket.remoteAddress || 'unknown';
        if (route === '/api/requests' && req.method === 'POST') {
          limit('submit:' + ip, options.submissionLimit || 30, 10 * 60 * 1000);
          const token = req.headers['idempotency-key'];
          if (typeof token !== 'string' || !/^[a-zA-Z0-9-]{20,80}$/.test(token)) throw failure(400, 'Mã gửi yêu cầu không hợp lệ.');
          const body = await readBody(req);
          const normalized = normalizeRequest(body);
          const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
          const payloadHash = crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
          const accepted = await serial(async () => {
            const existing = records.find(r => r.tokenHash === tokenHash);
            if (existing) {
              if (existing.payloadHash !== payloadHash) throw failure(409, 'Mã gửi đã dùng cho nội dung khác. Vui lòng tạo yêu cầu mới.');
              return existing;
            }
            const now = new Date().toISOString();
            const record = { id: 'YC-' + crypto.randomUUID().toUpperCase(), ...normalized, status: 'new', revision: 1, createdAt: now, updatedAt: now, tokenHash, payloadHash };
            await persist([record, ...records]);
            return record;
          });
          return json(res, 201, { id: accepted.id, createdAt: accepted.createdAt, status: accepted.status, ...(accepted.type === 'order' ? { total: accepted.total, shippingFee: accepted.shippingFee, items: accepted.items } : {}) });
        }
        if (route === '/api/admin/login' && req.method === 'POST') {
          limit('login:' + ip, 10, 15 * 60 * 1000);
          const body = await readBody(req);
          string(body.password, 'Mật khẩu', 1, 512);
          const hash = await scrypt(body.password, salt, 64);
          if (body.username !== username || !crypto.timingSafeEqual(hash, passwordHash)) throw failure(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
          for (const [id, entry] of sessions) if (entry.expires < Date.now()) sessions.delete(id);
          const token = crypto.randomBytes(32).toString('hex');
          sessions.set(token, { expires: Date.now() + 8 * 60 * 60 * 1000 });
          return json(res, 200, { username }, { 'Set-Cookie': cookie(token, 8 * 60 * 60) });
        }
        if (route.startsWith('/api/admin/')) {
          const token = session(req);
          if (route === '/api/admin/session' && req.method === 'GET') return json(res, 200, { username });
          if (route === '/api/admin/logout' && req.method === 'POST') {
            sessions.delete(token);
            return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
          }
          if (route === '/api/admin/requests' && req.method === 'GET') return json(res, 200, { requests: records.map(publicRecord) });
          const match = /^\/api\/admin\/requests\/(YC-[A-F0-9-]+)$/.exec(route);
          if (match && req.method === 'PATCH') {
            const body = await readBody(req);
            if (!STATUS.includes(body.status) || !Number.isInteger(body.revision)) throw failure(400, 'Trạng thái hoặc phiên bản không hợp lệ.');
            const updated = await serial(async () => {
              const record = records.find(r => r.id === match[1]);
              if (!record) throw failure(404, 'Không tìm thấy yêu cầu.');
              if (record.revision !== body.revision) throw failure(409, 'Yêu cầu đã được cập nhật ở nơi khác. Hãy làm mới hộp thư.');
              const next = { ...record, status: body.status, revision: record.revision + 1, updatedAt: new Date().toISOString() };
              await persist(records.map(r => r.id === record.id ? next : r));
              return next;
            });
            return json(res, 200, publicRecord(updated));
          }
        }
        throw failure(404, 'Không tìm thấy chức năng này.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw failure(405, 'Phương thức không được hỗ trợ.');
      const requested = decodeURIComponent(route === '/' ? '/index.html' : route);
      // Only public root assets and assets/ are served; server code and customer data are never public.
      if (!/^\/(?:[a-zA-Z0-9_-]+\.(?:html|css|js)|assets\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|webp|svg|ico))$/.test(requested) || requested.includes('..')) throw failure(404, 'Không tìm thấy trang.');
      const file = path.join(root, requested.slice(1));
      const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
      let content;
      try { content = await fs.readFile(file); } catch { throw failure(404, 'Không tìm thấy trang.'); }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (!res.headersSent && !res.destroyed) json(res, error.status || 500, { error: error.status ? error.message : 'Máy chủ gặp lỗi. Vui lòng thử lại sau.' });
    }
  }
  const server = http.createServer(handler);
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
if (require.main === module) {
  const production = process.env.NODE_ENV === 'production';
  if (production && !/^https:\/\//.test(process.env.PUBLIC_ORIGIN || '')) {
    console.error('Môi trường production cần PUBLIC_ORIGIN=https://ten-mien-cua-ban.');
    process.exitCode = 1;
  } else createApp({ adminUsername: process.env.ADMIN_USERNAME, adminPassword: process.env.ADMIN_PASSWORD, dataDir: process.env.DATA_DIR, publicOrigin: process.env.PUBLIC_ORIGIN, secureCookies: production }).then(server => {
    const port = Number(process.env.PORT || 3000), host = process.env.HOST || '127.0.0.1';
    server.listen(port, host, () => console.log(`Macca server: http://${host}:${port}\nAdmin: /admin.html#inbox`));
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createApp, normalizeRequest };
