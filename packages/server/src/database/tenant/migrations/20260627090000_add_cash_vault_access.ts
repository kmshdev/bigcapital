exports.up = async function (knex) {
  await knex.schema.alterTable('accounts', (table) => {
    table.boolean('is_cash_vault').notNullable().defaultTo(false);
    table.boolean('cash_vault_entry_enabled').notNullable().defaultTo(false);
    table.dateTime('cash_vault_designated_at').nullable();
    table.integer('cash_vault_designated_by_user_id').unsigned().nullable();

    table.index(['is_cash_vault', 'account_type']);
    table.index(['cash_vault_entry_enabled', 'is_cash_vault']);
  });

  await knex.schema.createTable('cash_vault_designated_admins', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('designated_by_user_id').unsigned().notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
  });

  await knex.schema.createTable('cash_vault_unlocks', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('granted_by_user_id').unsigned().notNullable();
    table.dateTime('expires_at').notNullable();
    table.dateTime('revoked_at').nullable();
    table.integer('revoked_by_user_id').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'expires_at', 'revoked_at']);
    table.index(['expires_at']);
  });

  await knex.schema.createTable('cash_vault_credentials', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().unique();
    table.string('password_hash').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
  });

  await knex.schema.createTable('expense_sheet_imports', (table) => {
    table.increments('id').primary();
    table.integer('uploaded_by_user_id').unsigned().notNullable();
    table.string('status', 32).notNullable();
    table.string('currency_code', 3).notNullable().defaultTo('INR');
    table.string('source_filename').notNullable();
    table.json('mapping').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['uploaded_by_user_id']);
    table.index(['status']);
  });

  await knex.schema.createTable('expense_sheet_rows', (table) => {
    table.increments('id').primary();
    table.integer('import_id').unsigned().notNullable();
    table.integer('row_number').unsigned().notNullable();
    table.json('values').notNullable();
    table.json('validation_errors').nullable();
    table.integer('committed_transaction_id').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['import_id', 'row_number']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('expense_sheet_rows');
  await knex.schema.dropTableIfExists('expense_sheet_imports');
  await knex.schema.dropTableIfExists('cash_vault_credentials');
  await knex.schema.dropTableIfExists('cash_vault_unlocks');
  await knex.schema.dropTableIfExists('cash_vault_designated_admins');

  await knex.schema.alterTable('accounts', (table) => {
    table.dropColumn('cash_vault_designated_by_user_id');
    table.dropColumn('cash_vault_designated_at');
    table.dropColumn('cash_vault_entry_enabled');
    table.dropColumn('is_cash_vault');
  });
};
