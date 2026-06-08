/** @jest-environment node */
const {
  signSession, verifySession, isAdmin, evaluateAdminRequest, COOKIE_NAME, SESSION_TTL_SECONDS,
} = require('../../lib/adminAuth');

const SECRET = 'test-secret-abc-123';
const future = () => Math.floor(Date.now() / 1000) + 100;
const past = () => Math.floor(Date.now() / 1000) - 100;

describe('adminAuth — sign/verify', () => {
  it('round-trips a payload', async () => {
    const token = await signSession({ expertId: 'e1', role: 'admin', email: 'a@b.c', exp: future() }, SECRET);
    const p = await verifySession(token, SECRET);
    expect(p).toMatchObject({ expertId: 'e1', role: 'admin', email: 'a@b.c' });
  });

  it('rejects tampered payload', async () => {
    const token = await signSession({ expertId: 'e1', role: 'admin', exp: future() }, SECRET);
    const [body, sig] = token.split('.');
    const flipped = body.slice(0, -1) + (body.slice(-1) === 'A' ? 'B' : 'A');
    expect(await verifySession(`${flipped}.${sig}`, SECRET)).toBeNull();
  });

  it('rejects wrong secret', async () => {
    const token = await signSession({ expertId: 'e1', exp: future() }, SECRET);
    expect(await verifySession(token, 'different-secret')).toBeNull();
  });

  it('rejects expired token', async () => {
    const token = await signSession({ expertId: 'e1', exp: past() }, SECRET);
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('fails closed without a secret', async () => {
    expect(await signSession({ expertId: 'e1', exp: future() }, '')).toBeNull();
    const token = await signSession({ expertId: 'e1', exp: future() }, SECRET);
    expect(await verifySession(token, '')).toBeNull();
  });

  it('rejects garbage tokens', async () => {
    expect(await verifySession('garbage', SECRET)).toBeNull();
    expect(await verifySession('', SECRET)).toBeNull();
    expect(await verifySession(null, SECRET)).toBeNull();
  });
});

describe('isAdmin', () => {
  it('accepts admin role or the admin email', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(isAdmin({ email: 'admin@habit.next' })).toBe(true);
  });
  it('rejects non-admin and null', () => {
    expect(isAdmin({ role: 'expert', email: 'x@y.z' })).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe('evaluateAdminRequest', () => {
  it('allows the login route without a token', async () => {
    const r = await evaluateAdminRequest({ pathname: '/api/admin/auth/login', token: undefined, secret: SECRET });
    expect(r.allow).toBe(true);
  });
  it('allows the logout route without a token', async () => {
    const r = await evaluateAdminRequest({ pathname: '/api/admin/auth/logout', token: undefined, secret: SECRET });
    expect(r.allow).toBe(true);
  });
  it('401 when no/invalid token', async () => {
    const r = await evaluateAdminRequest({ pathname: '/api/admin/templates', token: undefined, secret: SECRET });
    expect(r).toMatchObject({ allow: false, status: 401 });
  });
  it('403 when valid token but not admin', async () => {
    const token = await signSession({ expertId: 'e2', role: 'expert', email: 'x@y.z', exp: future() }, SECRET);
    const r = await evaluateAdminRequest({ pathname: '/api/admin/templates', token, secret: SECRET });
    expect(r).toMatchObject({ allow: false, status: 403 });
  });
  it('allows a valid admin token', async () => {
    const token = await signSession({ expertId: 'e1', role: 'admin', email: 'a@b.c', exp: future() }, SECRET);
    const r = await evaluateAdminRequest({ pathname: '/api/admin/plans/x/review', token, secret: SECRET });
    expect(r.allow).toBe(true);
  });
  it('protects the register route', async () => {
    const r = await evaluateAdminRequest({ pathname: '/api/admin/auth/register', token: undefined, secret: SECRET });
    expect(r).toMatchObject({ allow: false, status: 401 });
  });
});

describe('constants', () => {
  it('exports cookie name and ttl', () => {
    expect(COOKIE_NAME).toBe('admin_session');
    expect(SESSION_TTL_SECONDS).toBe(7 * 24 * 3600);
  });
});
