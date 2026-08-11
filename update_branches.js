const db = require('./server/src/db');
async function run() {
  await db('branch').where('code', '1').update({ name: 'Ekkaduthangal', name_tamil: 'ஈக்காடுதாங்கல்' });
  await db('branch').where('code', '2').update({ name: 'Saidapet', name_tamil: 'சைதாப்பேட்டை' });
  await db('branch').where('code', '3').update({ name: 'Ashok Nagar', name_tamil: 'அசோக் நகர்' });
  console.log('Branches updated successfully');
  process.exit();
}
run();
