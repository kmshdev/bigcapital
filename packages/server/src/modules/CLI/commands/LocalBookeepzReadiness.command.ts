import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'nest-commander';
import { ConfigService } from '@nestjs/config';
import { BaseCommand } from './BaseCommand';
import {
  evaluateEnvReadiness,
  parseDotEnvContent,
  ReadinessFailure,
} from './BookeepzReadinessEnv';
import { checkRuntimeFreshness } from './BookeepzReadinessRuntime';
import { checkBookeepzDatabaseReadiness } from './BookeepzReadinessDatabase';
import { runBookeepzApiProbes } from './BookeepzReadinessApi';
import { parseBootstrapSecrets } from './LocalBookeepzBootstrap.command';

type ReadinessSummary = {
  failures: ReadinessFailure[];
  sections: Record<string, any>;
};

function readEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return {};
  return parseDotEnvContent(fs.readFileSync(filePath, 'utf8'));
}

export function formatReadinessSummary(summary: ReadinessSummary) {
  const lines = [
    `Bookeepz readiness: ${summary.failures.length === 0 ? 'PASS' : 'FAIL'}`,
    '',
    '| Class | Operation | Target | Message |',
    '| --- | --- | --- | --- |',
  ];
  if (summary.failures.length === 0) {
    lines.push(
      '| pass | all | Bookeepz local readiness | Required checks passed. |',
    );
  } else {
    for (const failure of summary.failures) {
      lines.push(
        `| ${failure.class} | ${failure.operation} | ${failure.target} | ${failure.message.replace(/\|/g, '/')} |`,
      );
    }
  }
  lines.push('');
  lines.push(
    'Secrets: redacted. Output contains only presence, length, and bcrypt match booleans.',
  );
  return lines.join('\n');
}

@Command({
  name: 'local:bookeepz:readiness',
  description: 'Check local Bookeepz go-live readiness without printing secrets',
})
export class LocalBookeepzReadinessCommand extends BaseCommand {
  constructor(configService: ConfigService) {
    super(configService);
  }

  async run(): Promise<void> {
    const repoRoot = path.resolve(process.cwd(), '../..');
    const rootExamplePath = path.join(repoRoot, '.env.example');
    const activeEnvPath = path.join(repoRoot, '.env');
    const userEnvPath = path.join(repoRoot, '.user.env');
    const serverExamplePath = path.join(repoRoot, 'packages/server/.env.example');
    const webappExamplePath = path.join(repoRoot, 'packages/webapp/.env.example');
    const userEnvContent = fs.existsSync(userEnvPath)
      ? fs.readFileSync(userEnvPath, 'utf8')
      : '';

    const env = evaluateEnvReadiness({
      rootExample: readEnvFile(rootExamplePath),
      serverExample: readEnvFile(serverExamplePath),
      webappExample: readEnvFile(webappExamplePath),
      activeRoot: readEnvFile(activeEnvPath),
      userEnv: parseDotEnvContent(userEnvContent),
    });
    const runtime = await checkRuntimeFreshness({});
    const systemKnex = this.initSystemKnex();
    let database;
    try {
      database = await checkBookeepzDatabaseReadiness({
        systemKnex,
        tenantKnexFactory: (organizationId) => this.initTenantKnex(organizationId),
        userEnvContent,
      });
    } finally {
      await systemKnex.destroy?.();
    }
    const api = await runBookeepzApiProbes({
      baseUrl: env.runtime.baseUrl || 'http://127.0.0.1',
      passwords: parseBootstrapSecrets(userEnvContent),
    });

    const failures = [
      ...env.failures,
      ...runtime.failures,
      ...database.failures,
      ...api.failures,
    ];
    const summary = { failures, sections: { env, runtime, database, api } };
    this.log(formatReadinessSummary(summary));
    if (failures.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  }
}
