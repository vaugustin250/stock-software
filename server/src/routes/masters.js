const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ dest: 'uploads/' });

router.use(authenticate); // All master routes require auth

const createCrudRouter = (tableName) => {
  const r = express.Router();

  r.get('/', async (req, res) => {
    try {
      const data = await db(tableName).select('*').orderBy('id');
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.post('/', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
    try {
      const [inserted] = await db(tableName).insert(req.body).returning('*');
      res.json(inserted);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.put('/:id', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db(tableName).where({ id }).update(req.body).returning('*');
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return r;
};

// Expose basic CRUD for masters
router.use('/branches', createCrudRouter('branch'));
router.use('/groups', createCrudRouter('product_group'));
router.use('/departments', createCrudRouter('department'));
router.use('/units', createCrudRouter('unit'));
router.use('/products', createCrudRouter('product'));

// Special handlers for User (password hashing)
router.get('/users', requireRole(['ADMIN']), async (req, res) => {
  try {
    const users = await db('app_user').select('id', 'username', 'role', 'branch_id', 'is_active');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const bcrypt = require('bcryptjs');
router.post('/users', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { username, password, role, branch_id } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const [user] = await db('app_user').insert({ username, password_hash, role, branch_id }).returning(['id', 'username', 'role', 'branch_id']);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import products from Excel
router.post('/products/import', requireRole(['ADMIN', 'WAREHOUSE']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Expected columns from client spec: proid, code, name, groupname, department, provarcode, cgst, sgst, qtyformat, comcdid, comrate
    // In a real scenario, map this to DB schema. For Sprint 1, let's just return the preview logic so UI can display it
    
    // Cleanup the uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    res.json({ preview: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
