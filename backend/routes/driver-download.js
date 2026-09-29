// driver-download.js
// Serves the Huawei Mobile Partner driver installer as a downloadable ZIP file.
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const DRIVER_FILE = path.join(__dirname, '../uploads/drivers/Huawei-Mobile-Partner-Driver.zip');
const DRIVER_NAME = 'Huawei-Mobile-Partner-v23-Driver-Setup.zip';

// GET /api/drivers/huawei-modem
// Returns the Huawei Mobile Partner driver ZIP as a file download
router.get('/huawei-modem', (req, res) => {
  if (!fs.existsSync(DRIVER_FILE)) {
    return res.status(404).json({ error: 'Driver file not found on server.' });
  }
  res.setHeader('Content-Disposition', `attachment; filename="${DRIVER_NAME}"`);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 1 day
  res.sendFile(DRIVER_FILE);
});

// GET /api/drivers/info
// Returns metadata about available drivers
router.get('/info', (req, res) => {
  const exists = fs.existsSync(DRIVER_FILE);
  let size = 0;
  if (exists) {
    const stat = fs.statSync(DRIVER_FILE);
    size = stat.size;
  }
  res.json({
    available: exists,
    name: 'Huawei Mobile Partner v23.009.09.01.983',
    description: 'Latest Huawei Mobile Partner with Voice and USSD support for E173 USB Modem',
    filename: DRIVER_NAME,
    sizeMB: (size / (1024 * 1024)).toFixed(1),
    downloadUrl: '/api/drivers/huawei-modem',
  });
});

module.exports = router;
