const db = require('./src/db');

async function run() {
  try {
    const date = '2026-08-17';
    console.log('Fetching purchase men...');
    const purchaseMen = await db('app_user').select('id', 'username').where({ role: 'PURCHASE_MAN', active: true });
    
    console.log('Fetching pos...');
    const pos = await db('po_entry').where({ entry_date: date });
    const poIds = pos.map(p => p.id);

    console.log('Fetching closingStockLines...', poIds);
    let closingStockLines = [];
    if (poIds.length > 0) {
      closingStockLines = await db('po_entry_line')
        .select('product_id')
        .sum('qty as total_qty')
        .whereIn('po_entry_id', poIds)
        .groupBy('product_id');
    }

    console.log('Fetching products...');
    const products = await db('product')
      .join('unit', 'product.default_unit_id', 'unit.id')
      .select('product.id as product_id', 'product.name as product_name', 'product.name_tamil as product_name_tamil', 'product.default_unit_id as unit_id', 'unit.name as unit_name')
      .where({ 'product.is_active': true });

    console.log('Fetching allocations...');
    const allocations = await db('purchase_man_allocation').where({ date });

    console.log('Building matrix...');
    let matrix = products.map(prod => {
      const closingRow = closingStockLines.find(c => c.product_id === prod.product_id);
      const total_closing_qty = closingRow ? parseFloat(closingRow.total_qty) : 0;
      
      const prodAllocations = {};
      purchaseMen.forEach(pm => {
        const alloc = allocations.find(a => a.product_id === prod.product_id && a.purchase_man_id === pm.id);
        prodAllocations[pm.id] = alloc ? parseFloat(alloc.allocated_qty) : 0;
      });
      return { ...prod, total_closing_qty, allocations: prodAllocations };
    });

    console.log('Sorting matrix...');
    matrix.sort((a, b) => {
      if (a.total_closing_qty > 0 && b.total_closing_qty === 0) return -1;
      if (b.total_closing_qty > 0 && a.total_closing_qty === 0) return 1;
      return (a.product_name || '').localeCompare(b.product_name || '');
    });

    console.log('Success! Matrix length:', matrix.length);
  } catch (err) {
    console.error('FAILED:', err);
  } finally {
    process.exit();
  }
}
run();
