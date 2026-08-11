exports.up = async function(knex) {
  // 1. Create supplier table
  await knex.schema.createTable('supplier', table => {
    table.increments('id').primary();
    table.string('hall', 5).notNullable();          // e.g. A, B, C, D, E, F
    table.string('shop_no', 20).notNullable();       // e.g. 189, A-10
    table.string('name', 150).notNullable();
    table.string('name_tamil', 200);
    table.string('whatsapp', 15);
    table.string('address', 300);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    // Each shop_no is unique within a hall
    table.unique(['hall', 'shop_no']);
  });

  // 2. Add supplier_id to purchase_entry
  await knex.schema.alterTable('purchase_entry', table => {
    table.integer('supplier_id')
      .unsigned()
      .references('id')
      .inTable('supplier')
      .onDelete('SET NULL');
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('purchase_entry', table => {
    table.dropColumn('supplier_id');
  });
  await knex.schema.dropTableIfExists('supplier');
};
