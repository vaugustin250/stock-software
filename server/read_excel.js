const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('D:\\stock software\\product data\\Product.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // read as array of arrays
  
  console.log('Columns:', data[0]);
  console.log('First 5 rows:');
  for (let i = 1; i < Math.min(6, data.length); i++) {
    console.log(data[i]);
  }
} catch (err) {
  console.error('Error reading excel file:', err.message);
}
