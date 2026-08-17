exports.up = function(knex) {
  return knex.schema
    .alterTable('transfer_entry_line', table => {
      table.decimal('unit_qty', 10, 3).defaultTo(0).notNullable();
    })
    .alterTable('receiving_entry_line', table => {
      table.decimal('unit_qty', 10, 3).defaultTo(0).notNullable();
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('transfer_entry_line', table => {
      table.dropColumn('unit_qty');
    })
    .alterTable('receiving_entry_line', table => {
      table.dropColumn('unit_qty');
    });
};
