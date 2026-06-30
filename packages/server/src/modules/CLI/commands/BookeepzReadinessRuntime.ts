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

function runtimeFailure(target: string, message: string): ReadinessFailure {
  return {
    class: 'runtime_stale',
    operation: 'runtime.check',
    target,
    message,
  };
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

  const serverOutput = serverProbe.stdout;
  const webappOutput = webappProbe.stdout;
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
  if (!serverProbe.ok) {
    failures.push(runtimeFailure('bigcapital-server', serverProbe.stderr));
  }
  if (!webappProbe.ok) {
    failures.push(runtimeFailure('bigcapital-webapp', webappProbe.stderr));
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
