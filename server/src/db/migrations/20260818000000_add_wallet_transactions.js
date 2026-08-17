exports.up = async function(knex) {
  // 1. Create purchase_man_profile table
  await knex.schema.createTable('purchase_man_profile', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('app_user').onDelete('CASCADE');
    table.string('phone', 15);
    table.string('whatsapp', 15);
    table.string('address', 300);
    table.decimal('balance', 12, 2).defaultTo(0);
    table.timestamps(true, true);
    table.unique('user_id');
  });

  // 2. Create wallet_transaction table
  await knex.schema.createTable('wallet_transaction', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('app_user').onDelete('CASCADE');
    table.decimal('amount', 12, 2).notNullable();
    table.string('type', 20).notNullable(); // CREDIT, DEBIT
    table.string('description', 255);
    table.integer('reference_id'); // e.g. purchase_entry.id
    table.integer('created_by').unsigned().references('id').inTable('app_user').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('wallet_transaction');
  await knex.schema.dropTableIfExists('purchase_man_profile');
};
