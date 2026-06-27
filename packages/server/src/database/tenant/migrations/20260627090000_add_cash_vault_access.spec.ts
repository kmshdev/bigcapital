type RecordedTable = {
  name: string;
  columns: string[];
  indexes: string[][];
};

const createTableRecorder = () => {
  const createdTables: RecordedTable[] = [];
  const alteredTables: RecordedTable[] = [];

  const createBuilder = (name: string): RecordedTable => ({
    name,
    columns: [],
    indexes: [],
  });

  const createTableApi = (record: RecordedTable) => ({
    increments: (name: string) => {
      record.columns.push(name);
      return {
        primary: () => undefined,
      };
    },
    integer: (name: string) => {
      record.columns.push(name);
      return chain;
    },
    boolean: (name: string) => {
      record.columns.push(name);
      return chain;
    },
    dateTime: (name: string) => {
      record.columns.push(name);
      return chain;
    },
    timestamp: (name: string) => {
      record.columns.push(name);
      return chain;
    },
    string: (name: string) => {
      record.columns.push(name);
      return chain;
    },
    json: (name: string) => {
      record.columns.push(name);
      return chain;
    },
    index: (columns: string[]) => {
      record.indexes.push(columns);
    },
  });

  const chain = {
    unsigned: () => chain,
    nullable: () => chain,
    notNullable: () => chain,
    defaultTo: () => chain,
    references: () => chain,
    inTable: () => chain,
    onDelete: () => chain,
    index: () => chain,
  };

  const knex = {
    fn: {
      now: () => 'now',
    },
    schema: {
      alterTable: (name: string, callback: (table: any) => void) => {
        const record = createBuilder(name);
        alteredTables.push(record);
        callback(createTableApi(record));
        return Promise.resolve();
      },
      createTable: (name: string, callback: (table: any) => void) => {
        const record = createBuilder(name);
        createdTables.push(record);
        callback(createTableApi(record));
        return Promise.resolve();
      },
    },
  };

  return { knex, createdTables, alteredTables };
};

describe('20260627090000_add_cash_vault_access migration', () => {
  it('adds Cash Vault account flags and indexes to accounts', async () => {
    const migration = require('./20260627090000_add_cash_vault_access');
    const { knex, alteredTables } = createTableRecorder();

    await migration.up(knex);

    const accounts = alteredTables.find((table) => table.name === 'accounts');
    expect(accounts?.columns).toEqual(
      expect.arrayContaining([
        'is_cash_vault',
        'cash_vault_entry_enabled',
        'cash_vault_designated_at',
        'cash_vault_designated_by_user_id',
      ]),
    );
    expect(accounts?.indexes).toEqual(
      expect.arrayContaining([
        ['is_cash_vault', 'account_type'],
        ['cash_vault_entry_enabled', 'is_cash_vault'],
      ]),
    );
  });

  it('creates unlock, designated-admin, expense import, and expense row tables', async () => {
    const migration = require('./20260627090000_add_cash_vault_access');
    const { knex, createdTables } = createTableRecorder();

    await migration.up(knex);

    expect(createdTables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        'cash_vault_unlocks',
        'cash_vault_designated_admins',
        'expense_sheet_imports',
        'expense_sheet_rows',
      ]),
    );
  });

  it('indexes active unlock and expense import lookups', async () => {
    const migration = require('./20260627090000_add_cash_vault_access');
    const { knex, createdTables } = createTableRecorder();

    await migration.up(knex);

    const unlocks = createdTables.find(
      (table) => table.name === 'cash_vault_unlocks',
    );
    const imports = createdTables.find(
      (table) => table.name === 'expense_sheet_imports',
    );
    const rows = createdTables.find(
      (table) => table.name === 'expense_sheet_rows',
    );

    expect(unlocks?.indexes).toEqual(
      expect.arrayContaining([
        ['user_id', 'expires_at', 'revoked_at'],
        ['expires_at'],
      ]),
    );
    expect(imports?.indexes).toEqual(
      expect.arrayContaining([['uploaded_by_user_id'], ['status']]),
    );
    expect(rows?.indexes).toEqual(
      expect.arrayContaining([['import_id', 'row_number']]),
    );
  });
});
