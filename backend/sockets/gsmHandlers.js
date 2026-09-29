// gsmHandlers.js
// Socket.IO relay handlers for GSM Modem functionality across all connected CRM clients.
// Allows a single physical USB Modem PC to serve all CRM users remotely via cloud Socket.IO.

let activeGsmHost = null; // { socketId, state, lastSeen }
let latestModemState = {
  connected: false,
  call: 'idle',
  number: '',
  since: null,
  muted: false,
  audio: 'off',
  error: '',
  diagnostics: {},
  stats: {},
  logs: [],
  history: [],
};

const registerGsmHandlers = (io, socket) => {
  // 1. GSM Modem Host (the PC with USB dongle) registers itself
  socket.on('gsm:register_host', (initialState) => {
    activeGsmHost = {
      socketId: socket.id,
      state: initialState || latestModemState,
      lastSeen: Date.now(),
    };
    if (initialState) {
      latestModemState = { ...latestModemState, ...initialState, isHostOnline: true };
    }
    console.log(`📡 [GSM Relay] Modem Host registered: socket ${socket.id}`);
    io.emit('gsm:state_changed', { ...latestModemState, isHostOnline: true });
  });

  // 2. Modem Host sends real-time state update (signal, call ringing, connected, AT log)
  socket.on('gsm:host_state_update', (newState) => {
    if (activeGsmHost && activeGsmHost.socketId === socket.id) {
      activeGsmHost.state = newState;
      activeGsmHost.lastSeen = Date.now();
      latestModemState = { ...latestModemState, ...newState, isHostOnline: true };
      // Broadcast state update to all CRM clients
      io.emit('gsm:state_changed', { ...latestModemState, isHostOnline: true });
    }
  });

  // 3. Any CRM client (Device B, C, Mobile, Vercel app) requests current GSM state
  socket.on('gsm:get_state', (callback) => {
    const isHostAlive = activeGsmHost && (Date.now() - activeGsmHost.lastSeen < 15000);
    const responseState = {
      ...latestModemState,
      isHostOnline: Boolean(isHostAlive),
    };
    if (typeof callback === 'function') {
      callback(responseState);
    } else {
      socket.emit('gsm:state_changed', responseState);
    }
  });

  // 4. Any CRM client sends an action (connect, disconnect, dial, hangup, answer, mute, diagnostics)
  socket.on('gsm:client_action', async (data, callback) => {
    const { action, payload } = data || {};
    if (!activeGsmHost || !activeGsmHost.socketId) {
      const err = { error: 'No GSM Modem Host is online. Please ensure Start-GSM-Modem is running on the modem PC.' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    console.log(`📞 [GSM Relay] Action "${action}" requested by client ${socket.id} -> forwarding to host ${activeGsmHost.socketId}`);

    // Request action from Modem Host with timeout
    try {
      const response = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Modem Host response timed out.')), 10000);
        io.to(activeGsmHost.socketId).emit('gsm:execute_action', { action, payload }, (res) => {
          clearTimeout(timer);
          resolve(res);
        });
      });

      if (typeof callback === 'function') callback(response);
    } catch (err) {
      if (typeof callback === 'function') callback({ error: err.message });
    }
  });

  // 5. Handle disconnection of Modem Host
  socket.on('disconnect', () => {
    if (activeGsmHost && activeGsmHost.socketId === socket.id) {
      console.log(`📡 [GSM Relay] Modem Host disconnected: socket ${socket.id}`);
      activeGsmHost = null;
      latestModemState = {
        ...latestModemState,
        connected: false,
        isHostOnline: false,
        diagnostics: {},
        call: 'idle',
      };
      io.emit('gsm:state_changed', { ...latestModemState, isHostOnline: false });
    }
  });
};

module.exports = registerGsmHandlers;
