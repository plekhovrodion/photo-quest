import { describe, expect, it } from 'vitest';
import { PAYWALL_BUY_EVENT, parseBuyMessage } from './paywall';

const msg = (paymentPath: unknown, eventType: unknown = PAYWALL_BUY_EVENT) => ({ eventType, payload: { paymentPath } });

describe('parseBuyMessage', () => {
  it('отдаёт путь оплаты из сообщения о покупке', () => {
    expect(parseBuyMessage(msg('/payments/pay?plan=1'))).toBe('/payments/pay?plan=1');
  });
  it('другие события и мусор игнорирует', () => {
    expect(parseBuyMessage(msg('/pay', 'resize'))).toBeNull();
    expect(parseBuyMessage(null)).toBeNull();
    expect(parseBuyMessage('click_buy_button')).toBeNull();
    expect(parseBuyMessage({ eventType: PAYWALL_BUY_EVENT })).toBeNull();
  });
  it('не принимает чужие адреса и не строки', () => {
    for (const bad of ['https://evil.example/pay', '//evil.example/pay', '/\\evil.example', 'javascript:alert(1)', '', 5, null]) {
      expect(parseBuyMessage(msg(bad)), String(bad)).toBeNull();
    }
  });
});
