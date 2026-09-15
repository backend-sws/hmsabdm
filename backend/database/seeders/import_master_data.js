/**
 * HMS - Master Data Importer Script
 * Downloads ICD-10 + Indian Medicines and imports to PostgreSQL
 * Run: node import_master_data.js
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');
const { parse } = require('csv-parse');
const { Readable } = require('stream');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hms_abdm',
  user: 'hms_user',
  password: 'hms_pass',
});

const ICD10_URL = 'https://raw.githubusercontent.com/Bobrovskiy/ICD-10-CSV/master/2020/diagnosis.csv';
const MEDICINE_URL = 'https://raw.githubusercontent.com/junioralive/Indian-Medicine-Dataset/main/DATA/indian_medicine_data.csv';

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function downloadCSV(url) {
  console.log('Downloading:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  console.log('Downloaded', (text.length / 1024 / 1024).toFixed(1), 'MB');
  return text;
}

async function parseCSV(csvText) {
  return new Promise((resolve, reject) => {
    const records = [];
    Readable.from(csvText)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', r => records.push(r))
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

async function bulkInsert(client, table, columns, rows) {
  if (!rows.length) return;
  let total = 0;
  for (const chunk of chunkArray(rows, 500)) {
    const values = [];
    const ph = chunk.map((row, i) => {
      const off = i * columns.length;
      columns.forEach((_, ci) => values.push(row[ci]));
      return '(' + columns.map((_, ci) => '$' + (off + ci + 1)).join(',') + ')';
    });
    await client.query('INSERT INTO ' + table + ' (' + columns.join(',') + ') VALUES ' + ph.join(',') + ' ON CONFLICT DO NOTHING', values);
    total += chunk.length;
    process.stdout.write('\r  Inserted ' + total.toLocaleString() + ' rows...');
  }
  console.log('\n  Done:', total.toLocaleString(), 'rows');
}

async function importIcd10(client) {
  console.log('\n=== STEP 1: ICD-10 Codes ===');
  const existing = await client.query('SELECT COUNT(*) FROM icd10_codes');
  if (parseInt(existing.rows[0].count) > 0) { console.log('Already imported', existing.rows[0].count, 'codes. Skipping.'); return; }
  const csv = await downloadCSV(ICD10_URL);
  const records = await parseCSV(csv);
  console.log('Parsed', records.length, 'records');
  const rows = records.filter(r => r.Code && r.ShortDescription).map(r => {
    const code = r.Code.trim();
    const sep = (r.CodeWithSeparator || code).trim();
    const isHeader = !sep.includes('.');
    const catCode = isHeader ? null : code.substring(0, 3);
    return [code, sep, r.ShortDescription.trim().substring(0, 499), r.LongDescription?.trim() || null, r.HippaCovered === '1', isHeader, catCode];
  });
  await bulkInsert(client, 'icd10_codes', ['code','code_with_separator','short_description','long_description','is_billable','is_header','category_code'], rows);
}

async function importMedicines(client) {
  console.log('\n=== STEP 2: Indian Medicines ===');
  const check = await client.query('SELECT COUNT(*) as total, COUNT(salt_composition) as with_salt FROM medicines_master');
  const total = parseInt(check.rows[0].total);
  const withSalt = parseInt(check.rows[0].with_salt);

  if (total > 0 && withSalt > 0 && !process.argv.includes('--force')) {
    console.log(`Already imported ${total} medicines with valid salt compositions. Skipping. (Pass --force to re-import)`);
    return;
  }

  if (total > 0) {
    console.log(`Found ${total} medicines but salt_composition is missing (with_salt: ${withSalt}). Re-importing clean data...`);
    await client.query('TRUNCATE TABLE medicines_master RESTART IDENTITY');
  }

  const csv = await downloadCSV(MEDICINE_URL);
  const records = await parseCSV(csv);
  console.log('Parsed', records.length, 'records');
  if (records.length > 0) console.log('Columns:', Object.keys(records[0]).join(' | '));

  const rows = records.slice(0, 200000).map(r => {
    const brand = (r.name || r['Product Name'] || '').trim().substring(0, 254);
    if (!brand) return null;

    // Combine short_composition1 and short_composition2
    const compositions = [r.short_composition1, r.short_composition2]
      .filter(Boolean)
      .map(s => s.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    const salt = (compositions.length > 0 ? compositions.join(' + ') : (r.salt || r['Salt Composition'] || '')).trim();

    // Extract generic name (salt without dosage strengths like 500mg, 10ml, etc.)
    let generic = brand;
    if (salt) {
      generic = salt
        .split('+')
        .map(part => part.replace(/\(.*?\)/g, '').trim())
        .filter(Boolean)
        .join(' + ')
        .substring(0, 254);
    }

    const mfr = (r.manufacturer_name || r.manufacturer || r['Manufacturer'] || '').trim().substring(0, 254);
    const mrp = parseFloat(r['price(₹)'] || r.mrp || r.price || 0) || null;
    const cat = (r.type || r.therapeutic_class || '').trim().substring(0, 254);

    let form = 'Tablet';
    const textToCheck = (brand + ' ' + (r.pack_size_label || '')).toLowerCase();
    if (textToCheck.includes('syrup') || textToCheck.includes('suspension')) form = 'Syrup';
    else if (textToCheck.includes('injection') || textToCheck.includes('inj')) form = 'Injection';
    else if (textToCheck.includes('cream') || textToCheck.includes('ointment') || textToCheck.includes('gel')) form = 'Topical';
    else if (textToCheck.includes('drop')) form = 'Drops';
    else if (textToCheck.includes('capsule') || textToCheck.includes('cap')) form = 'Capsule';
    else if (textToCheck.includes('powder') || textToCheck.includes('sachet')) form = 'Powder';
    else if (textToCheck.includes('inhaler') || textToCheck.includes('respules')) form = 'Inhaler';

    return [
      brand,
      generic || brand,
      salt || null,
      form,
      mfr || null,
      cat || null,
      'Rx',
      mrp,
      false
    ];
  }).filter(Boolean);

  await bulkInsert(client, 'medicines_master', ['brand_name','generic_name','salt_composition','dosage_form','manufacturer','therapeutic_category','prescription_type','mrp','is_generic'], rows);
}

async function main() {
  console.log('\n=== HMS Master Data Importer ===');
  const client = await pool.connect();
  try {
    await importIcd10(client);
    await importMedicines(client);
    const icd = await client.query('SELECT COUNT(*) FROM icd10_codes');
    const med = await client.query('SELECT COUNT(*) FROM medicines_master');
    console.log('\n=== DONE ===');
    console.log('ICD-10 codes:', icd.rows[0].count);
    console.log('Medicines:', med.rows[0].count);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error('Check: 1) Docker running? 2) Migrations done? 3) Correct DB host?');
  } finally {
    client.release();
    await pool.end();
  }
}
main();
