const db = require('./src/db');
const xlsx = require('xlsx');

async function updateTamilNames() {
  console.log('Reading translated Excel file...');
  try {
    const workbook = xlsx.readFile('D:\\\\stock software\\\\product data\\\\Product_translated.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Read raw array of arrays
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Data starts at index 2
    const dataRows = rawData.slice(2).filter(row => row && row[4]); // Ensure there's a name

    console.log(`Found ${dataRows.length} rows in Excel. Updating database...`);

    let updatedCount = 0;

    for (const row of dataRows) {
      const code = String(row[2] || '');
      const tamilName = row[5] ? String(row[5]).trim() : null;

      if (code && tamilName) {
        // Update product by code
        const result = await db('product')
          .where('code', code)
          .update({ name_tamil: tamilName });
          
        if (result > 0) {
          updatedCount++;
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} products with Tamil names from Excel!`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating names:', error);
    process.exit(1);
  }
}

updateTamilNames();
