const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizeStatus, isKnownStatus, statuses } = require('./tracking');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'records.json');
const ARCHIVE_ID = crypto.createHash('sha256').update(__dirname.toLowerCase()).digest('hex');

// Middleware
app.use(cors());
app.use(express.json());

// 托管静态文件 (使得可以通过 http://localhost:3001/index.html 访问网页)
app.use(express.static(__dirname));

// Initialize records.json if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// GET all records
app.get('/api/health', (req, res) => {
  res.type('text/plain').send(`CHRONO-SEDIMENT\n${ARCHIVE_ID}`);
});

app.get('/api/records', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to read records' });
  }
});

// POST a new record
app.post('/api/records', (req, res) => {
  try {
    const newRecord = req.body;
    
    // Basic validation
    if (!newRecord.title || !newRecord.author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }
    if (newRecord.status !== undefined && !isKnownStatus(newRecord.status)) {
      return res.status(400).json({ error: '请选择有效的作品状态。' });
    }

    // Read current data
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const records = JSON.parse(data);

    // Assign an ID
    newRecord.id = Date.now(); // Simple unique ID
    
    // Default values if missing
    newRecord.type = newRecord.type || 'book';
    newRecord.season = newRecord.season || '春';
    newRecord.status = normalizeStatus(newRecord.status);
    newRecord.year = newRecord.year || new Date().getFullYear();
    newRecord.rating = newRecord.rating || 0;
    newRecord.tags = newRecord.tags || ['未分类'];
    newRecord.contributor = newRecord.contributor || '匿名访客';

    // Spine color generation (if not provided)
    if (!newRecord.spineColor) {
      const titleLen = newRecord.title.length;
      const authorLen = newRecord.author.length;
      newRecord.spineColor = [
        `hsl(${20 + Math.abs(titleLen * 7) % 40}, ${15 + Math.abs(authorLen * 3) % 10}%, ${55 + Math.abs(titleLen * 2) % 10}%)`,
        `hsl(${15 + Math.abs(titleLen * 7) % 40}, ${20 + Math.abs(authorLen * 5) % 15}%, ${20 + Math.abs(authorLen * 3) % 8}%)`
      ];
    }

    records.push(newRecord);

    // Save back to file
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save record' });
  }
});

// Only tracking status can be changed here; all other record fields are retained.
app.patch('/api/records/:id/status', (req, res) => {
  if (!statuses.includes(req.body.status)) {
    return res.status(400).json({ error: '请选择有效的作品状态。' });
  }
  try {
    const records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const record = records.find(item => String(item.id) === req.params.id);
    if (!record) return res.status(404).json({ error: '作品不存在，请刷新页面。' });
    record.status = req.body.status;
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
    res.json(record);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: '状态保存失败，请稍后重试。' });
  }
});

app.listen(PORT, () => {
  if (process.env.CHRONO_DESKTOP === '1') {
    fs.writeFileSync(path.join(__dirname, 'desktop-server.pid'), String(process.pid));
  }
  console.log(`Digital Archive Backend running on http://localhost:${PORT}`);
});
