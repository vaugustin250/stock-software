exports.up = function(knex) {
  return knex.schema.createTable('purchase_man_allocation', (table) => {
    table.increments('id').primary();
    table.date('date').notNullable();
    table.integer('purchase_man_id').unsigned().references('id').inTable('app_user').onDelete('CASCADE');
    table.integer('product_id').unsigned().references('id').inTable('product').onDelete('CASCADE');
    table.decimal('allocated_qty', 10, 2).notNullable().defaultTo(0);
    table.integer('unit_id').unsigned().references('id').inTable('unit');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['date', 'purchase_man_id', 'product_id'], 'unique_allocation_per_day');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('purchase_man_allocation');
};
