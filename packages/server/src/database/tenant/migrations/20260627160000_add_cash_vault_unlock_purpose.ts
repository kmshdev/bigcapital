exports.up = async function (knex) {
  const hasPurposeColumn = await knex.schema.hasColumn(
    'cash_vault_unlocks',
    'purpose',
  );
  if (!hasPurposeColumn) {
    await knex.schema.alterTable('cash_vault_unlocks', (table) => {
      table.string('purpose', 16).notNullable().defaultTo('manage');
      table.index(['user_id', 'purpose', 'expires_at', 'revoked_at']);
    });
  }
};

exports.down = async function (knex) {
  const hasPurposeColumn = await knex.schema.hasColumn(
    'cash_vault_unlocks',
    'purpose',
  );
  if (hasPurposeColumn) {
    await knex.schema.alterTable('cash_vault_unlocks', (table) => {
      table.dropColumn('purpose');
    });
  }
};
