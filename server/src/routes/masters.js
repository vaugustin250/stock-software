const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ dest: 'uploads/' });

router.use(authenticate);

const handleDbError = (err, res) => {
  if (err.code === '23505') return res.status(400).json({ error: 'This record already exists. Please use a unique value.' });
  if (err.code === '22001') return res.status(400).json({ error: 'An input value is too long. Please shorten it.' });
  if (err.code === '23503') return res.status(400).json({ error: 'Cannot delete this record because it is actively used in transactions.' });
  return res.status(400).json({ error: 'An unexpected database error occurred. Please verify your inputs.' });
};
 // All master routes require auth

const createCrudRouter = (tableName) => {
  const r = express.Router();

  r.get('/', async (req, res) => {
    try {
      const data = await db(tableName).select('*').orderBy('id');
      res.json(data);
    } catch (err) {
      return handleDbError(err, res);
    }
  });

  r.post('/', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
    try {
      const [inserted] = await db(tableName).insert(req.body).returning('*');
      res.json(inserted);
    } catch (err) {
      return handleDbError(err, res);
    }
  });

  r.put('/:id', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db(tableName).where({ id }).update(req.body).returning('*');
      res.json(updated);
    } catch (err) {
      return handleDbError(err, res);
    }
  });

  r.delete('/:id', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
    try {
      const { id } = req.params;
      await db(tableName).where({ id }).delete();
      res.json({ success: true });
    } catch (err) {
      // e.g. Foreign key constraint violation
      return handleDbError(err, res);
    }
  });

  return r;
};

router.use('/groups', createCrudRouter('product_group'));
router.use('/departments', createCrudRouter('department'));
router.use('/units', createCrudRouter('unit'));

// ── Supplier CRUD ─────────────────────────────────────────────────────────
// Searchable by hall, shop_no, or name.  Only ADMIN/WAREHOUSE can write.

router.get('/suppliers', async (req, res) => {
  try {
    const { q, hall, shop_no } = req.query;
    let query = db('supplier').where({ is_active: true }).orderBy('hall').orderBy('shop_no');

    if (hall) query = query.whereILike('hall', `${hall}%`);
    if (shop_no) query = query.whereILike('shop_no', `${shop_no}%`);
    if (q) {
      query = query.where(function() {
        this.whereILike('name', `%${q}%`)
          .orWhereILike('name_tamil', `%${q}%`)
          .orWhereILike('shop_no', `%${q}%`)
          .orWhereILike('hall', `%${q}%`);
      });
    }

    const data = await query;
    res.json(data);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.post('/suppliers', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const [inserted] = await db('supplier').insert(req.body).returning('*');
    res.json(inserted);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.put('/suppliers/:id', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await db('supplier').where({ id }).update(req.body).returning('*');
    res.json(updated);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.delete('/suppliers/:id', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const { id } = req.params;
    await db('supplier').where({ id }).update({ is_active: false }); // soft delete
    res.json({ success: true });
  } catch (err) {
    return handleDbError(err, res);
  }
});


// Custom CRUD for Godowns
router.get('/godowns', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    let query = db('branch').where({ type: 'GODOWN' }).orderBy('id');
    if (req.user.role === 'WAREHOUSE' && req.user.branch_id) {
       query = query.where({ id: req.user.branch_id });
    }
    const data = await query;
    res.json(data);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.post('/godowns', requireRole(['ADMIN']), async (req, res) => {
  try {
    const [inserted] = await db('branch').insert({ ...req.body, type: 'GODOWN' }).returning('*');
    res.json(inserted);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.put('/godowns/:id', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await db('branch').where({ id, type: 'GODOWN' }).update(req.body).returning('*');
    res.json(updated);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.delete('/godowns/:id', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    await db('branch').where({ id, type: 'GODOWN' }).delete();
    res.json({ success: true });
  } catch (err) {
    return handleDbError(err, res);
  }
});

// Custom CRUD for Branches under a Godown
router.get('/godowns/:godownId/branches', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const { godownId } = req.params;
    
    // WAREHOUSE users can only fetch their own godown's branches
    if (req.user.role === 'WAREHOUSE' && req.user.branch_id != godownId) {
       return res.status(403).json({ error: 'Forbidden' });
    }
    
    const data = await db('branch').where({ type: 'BRANCH', godown_id: godownId }).orderBy('id');
    res.json(data);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.post('/godowns/:godownId/branches', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const { godownId } = req.params;
    
    if (req.user.role === 'WAREHOUSE' && req.user.branch_id != godownId) {
       return res.status(403).json({ error: 'Forbidden' });
    }
    
    const [inserted] = await db('branch')
      .insert({ ...req.body, type: 'BRANCH', godown_id: godownId })
      .returning('*');
    res.json(inserted);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.put('/branches/:id', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.role === 'WAREHOUSE' && req.user.branch_id) {
       // Need to verify this branch belongs to the user's godown
       const branch = await db('branch').where({ id }).first();
       if (!branch || branch.godown_id != req.user.branch_id) {
           return res.status(403).json({ error: 'Forbidden' });
       }
    }
    
    const [updated] = await db('branch').where({ id, type: 'BRANCH' }).update(req.body).returning('*');
    res.json(updated);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.delete('/branches/:id', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.role === 'WAREHOUSE' && req.user.branch_id) {
       const branch = await db('branch').where({ id }).first();
       if (!branch || branch.godown_id != req.user.branch_id) {
           return res.status(403).json({ error: 'Forbidden' });
       }
    }
    
    await db('branch').where({ id, type: 'BRANCH' }).delete();
    res.json({ success: true });
  } catch (err) {
    return handleDbError(err, res);
  }
});

// Also provide a route to fetch all branches for users assignment and dropdowns
router.get('/branches', requireRole(['ADMIN', 'WAREHOUSE', 'BRANCH']), async (req, res) => {
  try {
    const data = await db('branch').select('*').orderBy('id');
    res.json(data);
  } catch (err) {
    return handleDbError(err, res);
  }
});
router.use('/products', createCrudRouter('product'));

// Special handlers for User (password hashing)
router.get('/users', requireRole(['ADMIN']), async (req, res) => {
  try {
    const users = await db('app_user').select('id', 'username', 'role', 'branch_id', 'is_active');
    res.json(users);
  } catch (err) {
    return handleDbError(err, res);
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
    return handleDbError(err, res);
  }
});

router.put('/users/:id', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, branch_id } = req.body;
    const updateData = { username, role, branch_id };
    
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }
    
    const [user] = await db('app_user').where({ id }).update(updateData).returning(['id', 'username', 'role', 'branch_id']);
    res.json(user);
  } catch (err) {
    return handleDbError(err, res);
  }
});

router.delete('/users/:id', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    await db('app_user').where({ id }).delete();
    res.json({ success: true });
  } catch (err) {
    return handleDbError(err, res);
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
    return handleDbError(err, res);
  }
});

module.exports = router;
