exports.up = async function(knex) {
  await knex.schema.alterTable('branch', table => {
    table.integer('godown_id').unsigned().references('id').inTable('branch').onDelete('CASCADE');
  });

  // Seed existing branches to belong to the first available godown
  const godowns = await knex('branch').where({ type: 'GODOWN' }).select('id');
  if (godowns.length > 0) {
    const defaultGodownId = godowns[0].id;
    await knex('branch')
      .where({ type: 'BRANCH' })
      .update({ godown_id: defaultGodownId });
  }
};

exports.down = function(knex) {
  return knex.schema.alterTable('branch', table => {
    table.dropColumn('godown_id');
  });
};
