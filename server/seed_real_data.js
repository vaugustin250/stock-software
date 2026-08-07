const db = require('./src/db');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');

async function seedRealData() {
  console.log('Starting data migration...');
  
  try {
    // 1. Wipe database cleanly using CASCADE
    console.log('Wiping old database entries...');
    await db.raw(`
      TRUNCATE TABLE 
        receiving_entry_line, receiving_entry, 
        transfer_entry_line, transfer_entry, 
        purchase_entry_line, purchase_entry, 
        po_entry_line, po_entry, 
        rate_ack, rate_change, 
        product, product_group, department, unit, app_user, branch 
      RESTART IDENTITY CASCADE
    `);

    // 2. Insert Units
    console.log('Inserting Units...');
    const unitsData = [
      { code: 'KG', name: 'KG', allow_decimal: true },
      { code: 'BOX', name: 'BOX', allow_decimal: false },
      { code: 'BAG', name: 'BAG', allow_decimal: false }
    ];
    const insertedUnits = await db('unit').insert(unitsData).returning('*');
    const kgUnitId = insertedUnits.find(u => u.code === 'KG').id;

    // 3. Insert Branches
    console.log('Inserting Branches...');
    const branchesData = [
      { code: 'HO', name: 'Head Office Godown', type: 'WAREHOUSE' },
      { code: 'RPC-1', name: 'RPC Branch 1', type: 'BRANCH' },
      { code: 'RPC-2', name: 'RPC Branch 2', type: 'BRANCH' },
      { code: 'RPC-3', name: 'RPC Branch 3', type: 'BRANCH' }
    ];
    const insertedBranches = await db('branch').insert(branchesData).returning('*');
    
    const ho = insertedBranches.find(b => b.code === 'HO');
    const rpc1 = insertedBranches.find(b => b.code === 'RPC-1');
    const rpc2 = insertedBranches.find(b => b.code === 'RPC-2');
    const rpc3 = insertedBranches.find(b => b.code === 'RPC-3');

    // 4. Create Logins
    console.log('Creating Users...');
    const pw = await bcrypt.hash('password123', 10);
    const adminPw = await bcrypt.hash('admin123', 10);
    
    await db('app_user').insert([
      { username: 'admin', password_hash: adminPw, role: 'ADMIN', branch_id: ho.id },
      { username: 'godown', password_hash: pw, role: 'WAREHOUSE', branch_id: ho.id },
      { username: 'rpc1', password_hash: pw, role: 'BRANCH', branch_id: rpc1.id },
      { username: 'rpc2', password_hash: pw, role: 'BRANCH', branch_id: rpc2.id },
      { username: 'rpc3', password_hash: pw, role: 'BRANCH', branch_id: rpc3.id }
    ]);

    // 5. Read Excel
    console.log('Reading Excel data...');
    const workbook = xlsx.readFile('D:\\stock software\\product data\\Product.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read raw array of arrays
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Header is row index 1 (the second row). Data starts at index 2.
    const dataRows = rawData.slice(2).filter(row => row && row.length > 0 && row[2]); // Must have a product name
    
    // Extract unique Groups and Departments
    const uniqueGroups = new Set();
    const uniqueDepts = new Set();
    
    dataRows.forEach(row => {
      const groupName = row[3];
      const deptName = row[4];
      if (groupName) uniqueGroups.add(groupName);
      if (deptName) uniqueDepts.add(deptName);
    });

    // 6. Insert Groups and Departments
    console.log(`Inserting ${uniqueGroups.size} Groups and ${uniqueDepts.size} Departments...`);
    const groupMap = {};
    for (const g of uniqueGroups) {
      const [inserted] = await db('product_group').insert({ name: g }).returning('id');
      groupMap[g] = inserted.id;
    }

    const deptMap = {};
    for (const d of uniqueDepts) {
      const [inserted] = await db('department').insert({ name: d }).returning('id');
      deptMap[d] = inserted.id;
    }

    // 7. Insert Products
    console.log(`Inserting ${dataRows.length} Products...`);
    
    const productsToInsert = dataRows.map(row => {
      return {
        code: String(row[1] || ''),
        name: String(row[2]).trim(),
        group_id: row[3] ? groupMap[row[3]] : null,
        department_id: row[4] ? deptMap[row[4]] : null,
        default_unit_id: kgUnitId, // Defaulting everything to KG as requested
        is_active: true
      };
    });

    // Batch insert products
    const chunkSize = 100;
    for (let i = 0; i < productsToInsert.length; i += chunkSize) {
      const chunk = productsToInsert.slice(i, i + chunkSize);
      await db('product').insert(chunk);
    }

    console.log('\n=========================================');
    console.log('✅ DATA MIGRATION COMPLETE!');
    console.log('=========================================');
    console.log(`- ${insertedBranches.length} Branches Created`);
    console.log(`- 5 Users Created`);
    console.log(`- ${uniqueGroups.size} Item Groups Created`);
    console.log(`- ${uniqueDepts.size} Departments Created`);
    console.log(`- ${productsToInsert.length} Products Imported`);
    console.log('\n--- DEFAULT LOGINS ---');
    console.log('Admin (HO): admin / admin123');
    console.log('Warehouse (HO): godown / password123');
    console.log('Branch RPC-1: rpc1 / password123');
    console.log('Branch RPC-2: rpc2 / password123');
    console.log('Branch RPC-3: rpc3 / password123');
    console.log('=========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

seedRealData();
