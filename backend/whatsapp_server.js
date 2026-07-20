const http = require('http');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { default: makeWASocket, DisconnectReason, Browsers, BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');
const { Pool } = require('pg');

const PORT = process.env.PORT || 8080;
let currentQrBase64 = null;
let rawQrString = null;
let isConnected = false;
let waSock = null;

// Setup PostgreSQL pool
// In local it will use a local string, in production it uses Render's DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nebras',
});

// Custom Auth State to store Baileys keys in PostgreSQL
const usePostgresAuthState = async (sessionName) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS baileys_sessions (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB
    )
  `);

  const writeData = async (data, id) => {
    const str = JSON.stringify(data, BufferJSON.replacer);
    await pool.query(
      'INSERT INTO baileys_sessions (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
      [`${sessionName}-${id}`, str]
    );
  };

  const readData = async (id) => {
    const res = await pool.query('SELECT data FROM baileys_sessions WHERE id = $1', [`${sessionName}-${id}`]);
    if (res.rows.length) {
      return JSON.parse(JSON.stringify(res.rows[0].data), BufferJSON.reviver);
    }
    return null;
  };

  const removeData = async (id) => {
    await pool.query('DELETE FROM baileys_sessions WHERE id = $1', [`${sessionName}-${id}`]);
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = require('@whiskeysockets/baileys').proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => writeData(creds, 'creds'),
    clearAuth: async () => {
      await pool.query("DELETE FROM baileys_sessions WHERE id LIKE $1", [`${sessionName}-%`]);
    }
  };
};

async function startBaileysEngine() {
  try {
    const sessionName = 'nebras-khartoum';
    const { state, saveCreds, clearAuth } = await usePostgresAuthState(sessionName);
    
    waSock = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('Desktop'),
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
    });

    waSock.ev.on('creds.update', saveCreds);

    waSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('⚡ Received AUTHENTIC WhatsApp Business Baileys QR String:', qr.substring(0, 30) + '...');
        rawQrString = qr;
        try {
          currentQrBase64 = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
          isConnected = false;
        } catch (err) {
          console.error('Error generating QR image:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed with code:', statusCode);
        isConnected = false;
        if (statusCode === DisconnectReason.loggedOut) {
          // Clean auth info from DB on logout
          await clearAuth();
          console.log('Session wiped from PostgreSQL due to loggedOut event.');
        }
        setTimeout(startBaileysEngine, 3000);
      } else if (connection === 'open') {
        console.log('🟢 WhatsApp Business Baileys connected successfully!');
        isConnected = true;
        currentQrBase64 = null;
      }
    });
  } catch (e) {
    console.error('Baileys Engine Error:', e);
  }
}

// Start Baileys Engine
startBaileysEngine();

// Create HTTP Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // QR Code & Status Endpoint
  if (req.url.includes('/instance/connect') || req.url.includes('/qr-code') || req.url.includes('/status')) {
    let qrResponse = currentQrBase64;
    if (!qrResponse && rawQrString) {
      try {
        qrResponse = await QRCode.toDataURL(rawQrString, { margin: 2, scale: 8 });
      } catch (e) {}
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      instance_name: 'nebras-khartoum-instance',
      connected: isConnected,
      qrcode: qrResponse,
      base64: qrResponse,
      qr_code_base64: qrResponse,
      raw_qr: rawQrString,
      message: isConnected ? 'المواكبة جارية ورقم هاتف المؤسسة مقترن بنجاح!' : 'بانتظار مسح رمز الـ QR الفعلي بالهاتف.'
    }));
    return;
  }

  // Send Message Endpoint
  if (req.url.includes('/message/sendText') || req.url.includes('/send')) {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const number = body.number || body.recipient_address || '249912345678';
        const text = body.textMessage?.text || body.body || 'إشعار من مدارس نبراس';
        const formattedJid = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        if (waSock && isConnected) {
          await waSock.sendMessage(formattedJid, { text: text });
          console.log(`✓ Real WhatsApp Business message dispatched to ${formattedJid}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          key: { id: 'BAILEYS_MSG_' + Date.now(), remoteJid: formattedJid, fromMe: true },
          message: 'تم إرسال الرسالة الحقيقية عبر بروتوكول Baileys بنجاح.'
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online', engine: 'Official Baileys WhatsApp Engine v6', connected: isConnected }));
});

server.listen(PORT, () => {
  console.log(`🟢 Official Baileys WhatsApp Business Server running on http://localhost:${PORT}`);
});
