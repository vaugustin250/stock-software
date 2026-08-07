const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    // Make sure we have a Head Office branch
    let hoBranch = await db('branch').where({ code: 'HO' }).first();
    if (!hoBranch) {
      const [inserted] = await db('branch').insert({ code: 'HO', name: 'Head Office Godown', type: 'WAREHOUSE' }).returning('*');
      hoBranch = inserted;
    }

    // Make sure we have a Retail Branch
    let retailBranch = await db('branch').where({ code: 'BR1' }).first();
    if (!retailBranch) {
      const [inserted] = await db('branch').insert({ code: 'BR1', name: 'Retail Branch 1', type: 'BRANCH' }).returning('*');
      retailBranch = inserted;
    }

    const hashedAdminPw = await bcrypt.hash('admin123', 10);
    const hashedWarehousePw = await bcrypt.hash('warehouse123', 10);
    const hashedBranchPw = await bcrypt.hash('branch123', 10);

    // Insert Users
    await db('app_user').insert([
      { username: 'admin', password_hash: hashedAdminPw, role: 'ADMIN', branch_id: hoBranch.id },
      { username: 'warehouse', password_hash: hashedWarehousePw, role: 'WAREHOUSE', branch_id: hoBranch.id },
      { username: 'branch1', password_hash: hashedBranchPw, role: 'BRANCH', branch_id: retailBranch.id }
    ]).onConflict('username').ignore();

    console.log('Successfully seeded users!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
