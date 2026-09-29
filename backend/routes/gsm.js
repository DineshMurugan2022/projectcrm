// gsm.js - Unified GSM Modem API router in backend
const express = require('express');
const router = express.Router();
const { getLatestState, executeAction } = require('../sockets/gsmHandlers');

// GET /api/gsm/state
router.get('/state', (req, res) => {
  try {
    const state = getLatestState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gsm/devices
router.get('/devices', (req, res) => {
  res.json({
    ports: [
      { path: 'COM4', friendlyName: 'HUAWEI Mobile Connect - 3G PC UI Interface (COM4)' },
      { path: 'COM5', friendlyName: 'HUAWEI Mobile Connect - 3G Application Interface (COM5)' }
    ],
    audio: [],
    audioError: ''
  });
});

// POST /api/gsm/:action (connect, disconnect, dial, answer, hangup, mute, diagnostics)
router.post('/:action', async (req, res) => {
  const action = req.params.action;
  const payload = req.body || {};

  try {
    const result = await executeAction(action, payload);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
