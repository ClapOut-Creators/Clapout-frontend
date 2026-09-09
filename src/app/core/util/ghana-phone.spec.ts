import { isGhanaMobile, normalizeGhanaMobile, toNationalGhanaMobile } from './ghana-phone';

describe('normalizeGhanaMobile', () => {
  it('accepts every common way of writing a Ghana mobile number', () => {
    expect(normalizeGhanaMobile('024 123 4567')).toBe('+233241234567');
    expect(normalizeGhanaMobile('0241234567')).toBe('+233241234567');
    expect(normalizeGhanaMobile('+233 24 123 4567')).toBe('+233241234567');
    expect(normalizeGhanaMobile('233241234567')).toBe('+233241234567');
    expect(normalizeGhanaMobile('00233241234567')).toBe('+233241234567');
    expect(normalizeGhanaMobile('(055) 987-6543')).toBe('+233559876543');
    expect(normalizeGhanaMobile('059 712 3456')).toBe('+233597123456');
  });

  it('refuses numbers from elsewhere and malformed ones', () => {
    expect(normalizeGhanaMobile('+1 518 489 2553')).toBeNull();
    expect(normalizeGhanaMobile('+15553311822')).toBeNull();
    expect(normalizeGhanaMobile('+2349038241991')).toBeNull();
    expect(normalizeGhanaMobile('0302 123 456')).toBeNull(); // landline range
    expect(normalizeGhanaMobile('024 123 456')).toBeNull(); // one digit short
    expect(normalizeGhanaMobile('024 123 45678')).toBeNull(); // one digit long
    expect(normalizeGhanaMobile('')).toBeNull();
    expect(isGhanaMobile('abc')).toBe(false);
  });

  it('formats a stored number nationally for prefilled forms', () => {
    expect(toNationalGhanaMobile('+233241234567')).toBe('024 123 4567');
    expect(toNationalGhanaMobile('+15553311822')).toBe('+15553311822');
  });
});
