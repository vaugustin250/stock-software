const db = require('./src/db');
const { translate } = require('@vitalets/google-translate-api');

async function translateProducts() {
  try {
    console.log('Fetching products to translate to Tamil...');
    const products = await db('product').whereNull('name_tamil').orWhere('name_tamil', '');

    console.log(`Found ${products.length} products to translate.`);

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      let success = false;
      let retries = 0;

      while (!success && retries < 5) {
        try {
          // Wait 2 seconds between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000 + (retries * 5000)));
          
          const res = await translate(p.name, { to: 'ta' });
          const tamilName = res.text;
          
          await db('product')
            .where({ id: p.id })
            .update({ name_tamil: tamilName });
            
          console.log(`[${i + 1}/${products.length}] ${p.name} -> ${tamilName}`);
          success = true;
        } catch (err) {
          if (err.message.includes('Too Many Requests') || err.message.includes('ECONNRESET')) {
            console.warn(`Rate limited on ${p.name}. Waiting ${5 + (retries * 5)}s before retry...`);
            retries++;
          } else {
            console.error(`Failed to translate ${p.name}:`, err.message);
            break; // skip this product if it's a hard error
          }
        }
      }
    }

    console.log('Finished translating all products!');
    process.exit(0);
  } catch (error) {
    console.error('Error in translation script:', error);
    process.exit(1);
  }
}

translateProducts();
