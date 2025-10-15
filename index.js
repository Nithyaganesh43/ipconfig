const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
 require('./app');
app.use(bodyParser.json());

// In-memory DB
const devices = new Map();

// POST /config
app.post('/config', (req, res) => {
  const { deviceName, wifiName, wifiPassword, deviceIp } = req.body;
  if (!deviceName || !wifiName || !wifiPassword || !deviceIp) {
    return res.status(400).json({ error: 'All fields required' });
  }
  devices.set(deviceName, {
    deviceName,
    wifiName,
    wifiPassword,
    deviceIp,
    updatedAt: new Date(),
  });
  res.json({ message: 'Device config saved' });
});

// Static HTML page
app.get('/', (req, res) => {
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Device Configs</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #333; padding: 8px; text-align: left; }
      th { background-color: #222; color: #fff; }
      td { background-color: #eee; }
    </style>
  </head>
  <body>
    <h1>Device Configs</h1>
    <table>
      <tr>
        <th>Device Name</th>
        <th>WiFi Name</th>
        <th>WiFi Password</th>
        <th>Device IP</th>
        <th>Last Updated</th>
      </tr>`;
  for (let [name, data] of devices.entries()) {
    html += `<tr>
      <td>${data.deviceName}</td>
      <td>${data.wifiName}</td>
      <td>${data.wifiPassword}</td>
      <td>${data.deviceIp}</td>
      <td>${data.updatedAt.toLocaleString()}</td>
    </tr>`;
  }
  html += `</table>
  </body>
  </html>`;
  res.send(html);
});

app.listen(port, () => console.log(`Server running on port ${port}`));
