/** 신규 판매 판정(순수 로직). 실제 경로(페이지·API·모의 PG)는 sales-block-e2e.test.mjs 가 확인한다. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decideNewSale } from '../../src/lib/billing/sales.ts';

test('new sales: no plan value is the existing Sniff purchase; FEM is stopped; nothing else is turned into Sniff', () => {
  assert.deepEqual(decideNewSale(undefined), { kind: 'on_sale', plan: 'sniff_premium' });
  assert.deepEqual(decideNewSale(null), { kind: 'on_sale', plan: 'sniff_premium' });
  assert.deepEqual(decideNewSale('sniff_premium'), { kind: 'on_sale', plan: 'sniff_premium' });
  assert.deepEqual(decideNewSale('fem_pro'), { kind: 'not_on_sale', plan: 'fem_pro' });
  for (const v of ['', ' ', 'FEM_PRO', 'fem_pro ', 'Sniff_Premium', 'sniff', 'free', '__proto__', 'constructor', 'toString',
    0, 1, true, false, [], ['fem_pro'], ['sniff_premium'], {}, { plan: 'sniff_premium' }]) {
    assert.deepEqual(decideNewSale(v), { kind: 'unknown' }, JSON.stringify(v));
  }
});
