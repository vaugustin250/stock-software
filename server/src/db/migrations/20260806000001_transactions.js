exports.up = function(knex) {
  return knex.schema
    // PO Entry
    .createTable('po_entry', table => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned().references('id').inTable('branch').notNullable();
      table.date('entry_date').notNullable();
      table.integer('created_by').unsigned().references('id').inTable('app_user');
      table.string('status', 15).defaultTo('SUBMITTED');
      table.timestamps(true, true);
      table.unique(['branch_id', 'entry_date']);
    })
    .createTable('po_entry_line', table => {
      table.increments('id').primary();
      table.integer('po_entry_id').unsigned().references('id').inTable('po_entry').onDelete('CASCADE');
      table.integer('product_id').unsigned().references('id').inTable('product');
      table.integer('unit_id').unsigned().references('id').inTable('unit');
      table.decimal('qty', 10, 3).defaultTo(0).notNullable();
    })
    // Purchase Entry
    .createTable('purchase_entry', table => {
      table.increments('id').primary();
      table.date('entry_date').notNullable();
      table.integer('created_by').unsigned().references('id').inTable('app_user');
      table.timestamps(true, true);
    })
    .createTable('purchase_entry_line', table => {
      table.increments('id').primary();
      table.integer('purchase_entry_id').unsigned().references('id').inTable('purchase_entry').onDelete('CASCADE');
      table.integer('product_id').unsigned().references('id').inTable('product');
      table.integer('unit_id').unsigned().references('id').inTable('unit');
      table.decimal('qty_purchased', 10, 3).defaultTo(0).notNullable();
      table.decimal('rate', 10, 2);
    })
    // Transfer Entry
    .createTable('transfer_entry', table => {
      table.increments('id').primary();
      table.date('transfer_date').notNullable();
      table.integer('branch_id').unsigned().references('id').inTable('branch').notNullable();
      table.integer('created_by').unsigned().references('id').inTable('app_user');
      table.timestamps(true, true);
    })
    .createTable('transfer_entry_line', table => {
      table.increments('id').primary();
      table.integer('transfer_entry_id').unsigned().references('id').inTable('transfer_entry').onDelete('CASCADE');
      table.integer('product_id').unsigned().references('id').inTable('product');
      table.integer('unit_id').unsigned().references('id').inTable('unit');
      table.decimal('qty_sent', 10, 3).defaultTo(0).notNullable();
    })
    // Receiving Entry
    .createTable('receiving_entry', table => {
      table.increments('id').primary();
      table.integer('transfer_entry_id').unsigned().references('id').inTable('transfer_entry').notNullable();
      table.integer('confirmed_by').unsigned().references('id').inTable('app_user');
      table.timestamps(true, true); // Use for confirmed_at
    })
    .createTable('receiving_entry_line', table => {
      table.increments('id').primary();
      table.integer('receiving_entry_id').unsigned().references('id').inTable('receiving_entry').onDelete('CASCADE');
      table.integer('transfer_entry_line_id').unsigned().references('id').inTable('transfer_entry_line');
      table.decimal('qty_received', 10, 3).defaultTo(0).notNullable();
    })
    // Rate History
    .createTable('rate_change', table => {
      table.increments('id').primary();
      table.integer('product_id').unsigned().references('id').inTable('product').notNullable();
      table.integer('branch_id').unsigned().references('id').inTable('branch').notNullable();
      table.decimal('rate', 10, 2).notNullable();
      table.integer('changed_by').unsigned().references('id').inTable('app_user');
      table.timestamps(true, true); // Use for changed_at
    })
    .createTable('rate_ack', table => {
      table.increments('id').primary();
      table.integer('rate_change_id').unsigned().references('id').inTable('rate_change');
      table.integer('branch_id').unsigned().references('id').inTable('branch');
      table.integer('acknowledged_by').unsigned().references('id').inTable('app_user');
      table.timestamps(true, true); // Use for acknowledged_at
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('rate_ack')
    .dropTableIfExists('rate_change')
    .dropTableIfExists('receiving_entry_line')
    .dropTableIfExists('receiving_entry')
    .dropTableIfExists('transfer_entry_line')
    .dropTableIfExists('transfer_entry')
    .dropTableIfExists('purchase_entry_line')
    .dropTableIfExists('purchase_entry')
    .dropTableIfExists('po_entry_line')
    .dropTableIfExists('po_entry');
};
