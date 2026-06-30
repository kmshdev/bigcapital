import systemDatabase from './system-database';
import tenantDatabase from './tenant-database';

describe('database port config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SYSTEM_DB_PORT;
    delete process.env.TENANT_DB_PORT;
    delete process.env.DB_PORT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults MySQL system and tenant connections to port 3306', () => {
    expect(systemDatabase().port).toBe(3306);
    expect(tenantDatabase().port).toBe(3306);
  });

  it('uses DB_PORT when provided', () => {
    process.env.DB_PORT = '3307';

    expect(systemDatabase().port).toBe('3307');
    expect(tenantDatabase().port).toBe('3307');
  });
});
