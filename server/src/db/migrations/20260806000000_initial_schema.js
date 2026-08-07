exports.up = function(knex) {
  return knex.schema
    // Branches
    .createTable('branch', table => {
      table.increments('id').primary();
      table.string('code', 10).notNullable().unique();
      table.string('name', 100).notNullable();
      table.string('name_tamil', 150);
      table.string('type', 20).notNullable(); // BRANCH, GODOWN, ADMIN
      table.boolean('is_active').defaultTo(true);
    })
    // Users
    .createTable('app_user', table => {
      table.increments('id').primary();
      table.string('username', 50).notNullable().unique();
      table.text('password_hash').notNullable();
      table.string('role', 20).notNullable(); // ADMIN, WAREHOUSE, BRANCH
      table.integer('branch_id').unsigned().references('id').inTable('branch').onDelete('SET NULL');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true); // created_at, updated_at
    })
    // Product Groups
    .createTable('product_group', table => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('name_tamil', 150);
      table.integer('sort_order').defaultTo(0);
    })
    // Departments
    .createTable('department', table => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('name_tamil', 150);
    })
    // Units
    .createTable('unit', table => {
      table.increments('id').primary();
      table.string('code', 10).notNullable().unique();
      table.string('name', 50).notNullable();
      table.boolean('allow_decimal').defaultTo(true);
    })
    // Products
    .createTable('product', table => {
      table.increments('id').primary();
      table.string('code', 20).notNullable().unique();
      table.string('name', 150).notNullable();
      table.string('name_tamil', 200);
      table.integer('group_id').unsigned().references('id').inTable('product_group').onDelete('SET NULL');
      table.integer('department_id').unsigned().references('id').inTable('department').onDelete('SET NULL');
      table.integer('default_unit_id').unsigned().references('id').inTable('unit').onDelete('SET NULL');
      table.decimal('default_qty', 10, 3).defaultTo(0);
      table.boolean('qty_decimal').defaultTo(true);
      table.boolean('is_active').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('product')
    .dropTableIfExists('unit')
    .dropTableIfExists('department')
    .dropTableIfExists('product_group')
    .dropTableIfExists('app_user')
    .dropTableIfExists('branch');
};
