const bcrypt = require('bcryptjs');
const db = require('./src/db');

(async () => {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    const exists = await db('app_user').where({ username: 'admin' }).first();
    if (exists) {
      await db('app_user').where({ username: 'admin' }).update({
        password_hash: hash,
        role: 'ADMIN',
        is_active: true
      });
      console.log('Admin user password RESET: admin / admin123');
    } else {
      await db('app_user').insert({
        username: 'admin',
        password_hash: hash,
        role: 'ADMIN',
        is_active: true
      });
      console.log('Admin user CREATED: admin / admin123');
    }
    console.log('Done!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
