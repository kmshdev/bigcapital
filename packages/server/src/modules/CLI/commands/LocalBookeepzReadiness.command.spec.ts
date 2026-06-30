import {
  formatReadinessSummary,
  LocalBookeepzReadinessCommand,
  resolveReadinessApiBaseUrl,
} from './LocalBookeepzReadiness.command';

describe('LocalBookeepzReadinessCommand', () => {
  it('formats failures by class and target without secret values', () => {
    const text = formatReadinessSummary({
      failures: [
        {
          class: 'env_missing',
          operation: 'env.check',
          target: '.user.env:ADMINF0_PASSWORD',
          message: 'missing',
        },
      ],
      sections: {
        env: { failures: [] },
        runtime: { failures: [] },
        database: { failures: [] },
        api: { failures: [] },
      },
    });

    expect(text).toContain('Bookeepz readiness: FAIL');
    expect(text).toContain('env_missing');
    expect(text).toContain('.user.env:ADMINF0_PASSWORD');
    expect(text).not.toContain('password=');
    expect(text).not.toContain('Bearer ');
  });

  it('can be constructed by Nest command registration', () => {
    expect(LocalBookeepzReadinessCommand).toBeDefined();
  });

  it('prefers explicit readiness API base URL override', () => {
    expect(
      resolveReadinessApiBaseUrl({
        envBaseUrl: 'http://127.0.0.1',
        processEnv: {
          BOOKEEPZ_READINESS_BASE_URL: 'http://127.0.0.1:3000',
        },
      }),
    ).toBe('http://127.0.0.1:3000');
  });
});
