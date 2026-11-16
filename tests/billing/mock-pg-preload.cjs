/**
 * 모의 PG (시험 전용). 웹 서버를 `NODE_OPTIONS="--require <이 파일>"`로 띄우면 포트원 API(api.portone.io)로 나가는
 * 요청을 실제로 보내지 않고 이 파일이 대신 답한다. 결제창 호출·빌링키 발급·청구·환불은 일어나지 않는다.
 *
 *   BILLING_E2E_PG_LOG   : 호출 기록(메서드와 경로 형태만, 한 줄씩). 본문·시크릿·빌링키는 적지 않는다.
 *   BILLING_E2E_PG_STATE : 모의 상태(JSON 파일). 시험이 빌링키·결제 상태를 여기에 써서 상황을 만든다.
 *       { "billingKeys": { "<key>": { "customerId": "<uuid>" } }, "payments": { "<id>": {...} }, "declineCount": 0 }   (declineCount: 다음 N번의 청구를 거절)
 *
 * 포트원 밖의 요청은 그대로 통과시킨다. 두 환경변수가 없으면 로드 자체를 거부한다(운영에서 실수로 쓰이지 않게).
 */
// `node --require` 로 미리 싣는 파일이라 CommonJS 여야 한다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs');
const LOG = process.env.BILLING_E2E_PG_LOG, STATE = process.env.BILLING_E2E_PG_STATE;
if (!LOG || !STATE) throw new Error('mock-pg-preload: BILLING_E2E_PG_LOG and BILLING_E2E_PG_STATE are required');
const read = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; } };
const write = (s) => fs.writeFileSync(STATE, JSON.stringify(s));
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const realFetch = globalThis.fetch;

globalThis.fetch = async function mockPgFetch(input, init) {
  const req = typeof input === 'string' || input instanceof URL ? null : input;
  const url = new URL(req ? req.url : String(input));
  if (!/(^|\.)portone\.io$/.test(url.hostname)) return realFetch(input, init);
  const method = ((init && init.method) || (req && req.method) || 'GET').toUpperCase();
  const rawBody = init && init.body != null ? String(init.body) : req ? await req.clone().text() : '';
  let body = {};
  try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }
  // GET 요청의 본문은 SDK 가 requestBody 쿼리로 보낸다. 여기서는 경로만 쓴다.
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const shape = `${method} /${parts.map((p, i) => (i === 1 ? (parts[0] === 'billing-keys' ? '<key>' : '<id>') : p)).join('/')}`;
  fs.appendFileSync(LOG, shape + '\n');
  const s = read(); s.billingKeys ??= {}; s.payments ??= {};

  if (parts[0] === 'billing-keys' && parts.length === 2) {
    const key = parts[1], k = s.billingKeys[key];
    if (!k) return json(404, { type: 'BILLING_KEY_NOT_FOUND', message: 'mock' });
    if (method === 'DELETE') { delete s.billingKeys[key]; write(s); return json(200, { deletedAt: new Date().toISOString() }); }
    return json(200, { status: k.status ?? 'ISSUED', billingKey: key, merchantId: 'mock-merchant', storeId: 'mock-store',
      customer: { id: k.customerId }, channels: [], issuedAt: new Date().toISOString(),
      methods: [{ type: 'BillingKeyPaymentMethodCard', card: { name: 'MockCard', number: '0000-00**-****-0000' } }] });
  }
  if (parts[0] === 'payments' && parts.length === 3 && parts[2] === 'billing-key' && method === 'POST') {
    const id = parts[1];
    if (s.payments[id]) return json(409, { type: 'ALREADY_PAID', message: 'mock' });
    if (!s.billingKeys[body.billingKey]) return json(404, { type: 'BILLING_KEY_NOT_FOUND', message: 'mock' });
    if (s.declineCount > 0) { s.declineCount -= 1; write(s); return json(502, { type: 'PG_PROVIDER', pgCode: 'MOCK_DECLINED', pgMessage: 'mock decline', message: 'mock' }); }
    const paidAt = new Date().toISOString();
    s.payments[id] = { status: 'PAID', id, transactionId: `mock-tx-${id.slice(-8)}`, merchantId: 'mock-merchant', storeId: 'mock-store',
      orderName: body.orderName, amount: { total: body.amount?.total, taxFree: 0, discount: 0, paid: body.amount?.total, cancelled: 0, cancelledTaxFree: 0 },
      currency: body.currency, billingKey: body.billingKey, customer: { id: body.customer?.id }, paidAt, requestedAt: paidAt, updatedAt: paidAt, statusChangedAt: paidAt,
      channel: { type: 'TEST', pgProvider: 'KCP_V2' }, version: 'V2', isCulturalExpense: false };
    write(s);
    return json(200, { payment: { pgTxId: 'mock-pg-tx', paidAt } });
  }
  if (parts[0] === 'payments' && parts.length === 2 && method === 'GET') {
    const p = s.payments[parts[1]];
    return p ? json(200, p) : json(404, { type: 'PAYMENT_NOT_FOUND', message: 'mock' });
  }
  return json(501, { type: 'MOCK_NOT_IMPLEMENTED', message: shape });
};
