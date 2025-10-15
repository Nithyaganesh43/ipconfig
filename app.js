const https = require('https');
const axios = require('axios');

const API_KEY = 'admin12345';
const GET_SERVERS_URL =
  'https://thewatchtower.onrender.com/servers/getall?API_KEY=';
const REPORT_SERVERS_URL =
  'https://thewatchtower.onrender.com/servers/reportallservers?API_KEY=';
const MAX_SERVERS = 200;
const PING_TIMEOUT = 5000;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function fetchPingReport() {
  try {
    //console.log('Fetching servers...');
    const { data } = await axios.get(GET_SERVERS_URL + API_KEY, {
      httpsAgent,
      timeout: 20000,
    });
    if (!data.servers || data.servers.length === 0) {
      //console.log('No servers found.');
      return;
    }

    const servers = data.servers.slice(0, MAX_SERVERS);
    const failedServers = [];

    for (const server of servers) {
      try {
        const res = await axios.get(server.url, {
          httpsAgent,
          timeout: PING_TIMEOUT,
          validateStatus: () => true,
        });
        if (res.status >= 200 && res.status < 500) {
          //console.log(`✅ Server online: ${server.url} (status ${res.status})`);
        } else {
          //console.log(`❌ Server failed: ${server.url} (status ${res.status})`);
          failedServers.push(server.id);
        }
      } catch (err) {
        //console.log(`❌ Server failed: ${server.url} (error: ${err.message})`);
        failedServers.push(server.id);
      }
    }

    if (failedServers.length > 0) {
      //console.log('Reporting failed servers:', failedServers);
      await axios.post(
        REPORT_SERVERS_URL + API_KEY,
        { report: { failed: failedServers } },
        {
          httpsAgent,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
      //console.log('Failed servers reported successfully.');
    } else {
      //console.log('All servers are online.');
    }

    //console.log('Check completed at', new Date());
  } catch (err) {
    //console.log('Error fetching servers:', err.message);
  }
}

// Schedule function with random interval between 7-13 minutes
function scheduleRandomCron() {
  const minutes = Math.floor(Math.random() * (13 - 7 + 1)) + 7;
  //console.log(`Next run in ${minutes} minutes.`);
  setTimeout(async () => {
    await fetchPingReport();
    scheduleRandomCron();
  }, minutes * 60 * 1000);
}

// Initial run
(async () => {
  await fetchPingReport();
  scheduleRandomCron();
})();
