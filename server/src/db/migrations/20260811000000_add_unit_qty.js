exports.up = function(knex) {
  return knex.schema
    .alterTable('po_entry_line', table => {
      table.decimal('unit_qty', 10, 1).defaultTo(0).notNullable();
    })
    .alterTable('purchase_entry_line', table => {
      table.decimal('unit_qty', 10, 1).defaultTo(0).notNullable();
    })
    .alterTable('transfer_entry_line', table => {
      table.decimal('unit_qty', 10, 1).defaultTo(0).notNullable();
    })
    .alterTable('receiving_entry_line', table => {
      table.decimal('unit_qty', 10, 1).defaultTo(0).notNullable();
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('po_entry_line', table => {
      table.dropColumn('unit_qty');
    })
    .alterTable('purchase_entry_line', table => {
      table.dropColumn('unit_qty');
    })
    .alterTable('transfer_entry_line', table => {
      table.dropColumn('unit_qty');
    })
    .alterTable('receiving_entry_line', table => {
      table.dropColumn('unit_qty');
    });
};
