import { execFile } from 'child_process';
import { promisify } from 'util';
import { ReadinessFailure } from './BookeepzReadinessEnv';

const execFileAsync = promisify(execFile);

export type RuntimeCommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

export type RuntimeCommandRunner = (
  command: string,
  args: string[],
) => Promise<RuntimeCommandResult>;

export const dockerRunner: RuntimeCommandRunner = async (command, args) => {
  try {
    const result = await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 4,
    });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error: any) {
    return {
      ok: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
    };
  }
};

export const shellRunner: RuntimeCommandRunner = async (command, args) => {
  try {
    const result = await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 4,
    });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error: any) {
    return {
      ok: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
    };
  }
};

function runtimeFailure(target: string, message: string): ReadinessFailure {
  return {
    class: 'runtime_stale',
    operation: 'runtime.check',
    target,
    message,
  };
}

function evaluateRuntimeProbeResults(input: {
  serverProbe: RuntimeCommandResult;
  webappProbe: RuntimeCommandResult;
}) {
  const serverOutput = input.serverProbe.stdout;
  const webappOutput = input.webappProbe.stdout;
  const markers = {
    server: {
      challengeSplit:
        serverOutput.includes('cash_vault_unlock_user_not_designated') &&
        serverOutput.includes('cash_vault_challenge_invalid'),
      balanceSheetGuard:
        serverOutput.includes('ACCOUNT_PARENT_TYPE.INCOME) ?? []') &&
        serverOutput.includes('ACCOUNT_PARENT_TYPE.EXPENSE) ?? []'),
    },
    webapp: {
      challengeMessageSplit: webappOutput.includes(
        'Cash Vault management access is limited to the two designated admins.',
      ),
    },
  };

  const failures: ReadinessFailure[] = [];
  if (!input.serverProbe.ok) {
    failures.push(runtimeFailure('bigcapital-server', input.serverProbe.stderr));
  }
  if (!input.webappProbe.ok) {
    failures.push(runtimeFailure('bigcapital-webapp', input.webappProbe.stderr));
  }
  if (!markers.server.challengeSplit) {
    failures.push(
      runtimeFailure(
        'bigcapital-server:CashVaultChallengeService',
        'Running server does not contain Cash Vault challenge error classification.',
      ),
    );
  }
  if (!markers.server.balanceSheetGuard) {
    failures.push(
      runtimeFailure(
        'bigcapital-server:BalanceSheetRepositoryNetIncome',
        'Running server does not contain missing income/expense group fallback.',
      ),
    );
  }
  if (!markers.webapp.challengeMessageSplit) {
    failures.push(
      runtimeFailure(
        'bigcapital-webapp:CashVaultChallengeDialog',
        'Running webapp does not contain designated-admin challenge message split.',
      ),
    );
  }

  return { failures, markers };
}

async function fetchText(fetchImpl: typeof fetch, url: string) {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed with status ${response.status}`);
  }
  return response.text();
}

async function fetchWebappAssetText(fetchImpl: typeof fetch, baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const html = await fetchText(fetchImpl, normalizedBaseUrl);
  const assetPaths = Array.from(
    html.matchAll(/(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/g),
  ).map((match) => match[1]);
  const assetTexts = await Promise.all(
    assetPaths.slice(0, 20).map((assetPath) => {
      const assetUrl = new URL(
        assetPath,
        `${normalizedBaseUrl}/`,
      ).toString();
      return fetchText(fetchImpl, assetUrl);
    }),
  );
  return [html, ...assetTexts].join('\n');
}

export async function checkRuntimeFreshness({
  runner = dockerRunner,
}: {
  runner?: RuntimeCommandRunner;
}) {
  const serverProbe = await runner('docker', [
    'exec',
    'bigcapital-server',
    'sh',
    '-lc',
    [
      'grep -R "cash_vault_unlock_user_not_designated" -n /app/packages/server/dist || true',
      'grep -R "cash_vault_challenge_invalid" -n /app/packages/server/dist || true',
      'grep -R "ACCOUNT_PARENT_TYPE.INCOME) ?? \\[\\]" -n /app/packages/server/dist || true',
      'grep -R "ACCOUNT_PARENT_TYPE.EXPENSE) ?? \\[\\]" -n /app/packages/server/dist || true',
    ].join('; '),
  ]);

  const webappProbe = await runner('docker', [
    'exec',
    'bigcapital-webapp',
    'sh',
    '-lc',
    'grep -R "Cash Vault management access is limited to the two designated admins." -n /usr/share/nginx/html || true',
  ]);

  return evaluateRuntimeProbeResults({ serverProbe, webappProbe });
}

export async function checkContainerRuntimeFreshness({
  runner = shellRunner,
  fetchImpl = fetch,
  webappBaseUrl = 'http://proxy',
  webappMarkerOutput,
}: {
  runner?: RuntimeCommandRunner;
  fetchImpl?: typeof fetch;
  webappBaseUrl?: string;
  webappMarkerOutput?: string;
}) {
  const serverProbe = await runner('sh', [
    '-lc',
    [
      'grep -R "cash_vault_unlock_user_not_designated" -n /app/packages/server/dist || true',
      'grep -R "cash_vault_challenge_invalid" -n /app/packages/server/dist || true',
      'grep -R "ACCOUNT_PARENT_TYPE.INCOME) ?? \\[\\]" -n /app/packages/server/dist || true',
      'grep -R "ACCOUNT_PARENT_TYPE.EXPENSE) ?? \\[\\]" -n /app/packages/server/dist || true',
    ].join('; '),
  ]);
  let webappProbe: RuntimeCommandResult;
  if (webappMarkerOutput) {
    webappProbe = {
      ok: true,
      stdout: webappMarkerOutput,
      stderr: '',
    };
  } else {
    try {
      webappProbe = {
        ok: true,
        stdout: await fetchWebappAssetText(fetchImpl, webappBaseUrl),
        stderr: '',
      };
    } catch (error: any) {
      webappProbe = {
        ok: false,
        stdout: '',
        stderr: error.message,
      };
    }
  }

  return evaluateRuntimeProbeResults({ serverProbe, webappProbe });
}
