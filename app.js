const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const router = express.Router();

const LOG_FILE = path.join(__dirname, 'ping.log');
const MAX_LOGS = 1000;
const API_KEY = 'admin12345';
const GET_SERVERS_URL =
  'https://thewatchtower.onrender.com/servers/getall?API_KEY=';
const REPORT_SERVERS_URL =
  'https://thewatchtower.onrender.com/servers/reportallservers?API_KEY=';
const MAX_SERVERS = 200;
const PING_TIMEOUT = 5000;
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function logRequest(type, url, response = '') {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const entry = JSON.stringify({ type, url, response, time });
  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    logs = content ? content.split('\n').filter(Boolean) : [];
  }
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs = logs.slice(logs.length - MAX_LOGS);
  fs.writeFileSync(LOG_FILE, logs.join('\n'), 'utf-8');
}

router.use((req, res, next) => {
  logRequest('incoming', req.originalUrl);
  next();
});
async function fetchPingReport() {
  try {
    let resGet;
    try {
      resGet = await axios.get(GET_SERVERS_URL + API_KEY, {
        httpsAgent,
        timeout: 20000,
      });
      logRequest('outgoing', GET_SERVERS_URL + API_KEY, 'ok');
    } catch {
      logRequest('outgoing', GET_SERVERS_URL + API_KEY, 'not ok');
      return;
    }

    if (!resGet.data.servers || resGet.data.servers.length === 0) return;

    const servers = resGet.data.servers.slice(0, MAX_SERVERS);
    const failedServers = [];

    for (const server of servers) {
      try {
        let resPing = await axios.get(server.url, {
          httpsAgent,
          timeout: PING_TIMEOUT,
          validateStatus: () => true,
        });
        const statusText = resPing.status < 500 ? 'ok' : 'not ok';
        logRequest('outgoing', server.url, statusText);
        if (resPing.status >= 500) failedServers.push(server.id);
      } catch {
        logRequest('outgoing', server.url, 'not ok');
        failedServers.push(server.id);
      }
    }

    // Always try to send report, even if failedServers is empty
    try {
      await axios.post(
        REPORT_SERVERS_URL + API_KEY,
        { report: { failed: failedServers } },
        {
          httpsAgent,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
      logRequest('outgoing', REPORT_SERVERS_URL + API_KEY, 'ok');
    } catch {
      logRequest('outgoing', REPORT_SERVERS_URL + API_KEY, 'not ok');
    }
  } catch {}
}

function scheduleRandomCron() {
  const minutes = Math.floor(Math.random() * (13 - 7 + 1)) + 7;
  setTimeout(async () => {
    await fetchPingReport();
    scheduleRandomCron();
  }, minutes * 60 * 1000);
}

(async () => {
  await fetchPingReport();
  scheduleRandomCron();
})();

router.get('/log', (req, res) => {
  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    logs = fs
      .readFileSync(LOG_FILE, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  let html = `<html><head><style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; }
    table { border-collapse: collapse; width: 95%; margin: 20px auto; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background-color: #222; color: #fff; }
    .incoming { background-color: #d4edda; }
    .outgoing.ok { background-color: #cce5ff; }
    .outgoing.not { background-color: #f8d7da; }
  </style></head><body>
  <h2 style="text-align:center;">Ping Log</h2>
  <table><tr><th>Type</th><th>URL</th><th>Status</th><th>Time (IST)</th></tr>`;
  for (const log of logs) {
    let status = log.type === 'outgoing' ? log.response || '' : '';
    let rowClass =
      log.type === 'outgoing'
        ? `outgoing ${log.response === 'ok' ? 'ok' : 'not'}`
        : 'incoming';
    html += `<tr class="${rowClass}"><td>${log.type}</td><td>${log.url}</td><td>${status}</td><td>${log.time}</td></tr>`;
  }
  html += '</table></body></html>';
  res.send(html);
});

module.exports = router;
