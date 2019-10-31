// Environment file path
const path = require('path');
const envPath = path.join(path.resolve(__dirname, '../'), '.env');
require('dotenv').config({ path: envPath });

//Imports
require('./utils/Array.prototype.last');
require('./utils/String.prototype.includesArray');
require('./utils/Object.prototype.prepareData');
require('./utils/Object.prototype.prepareDataUpdate');
const worker = require('./worker');
const metricsClient = require("@condor-labs/metrics");
const OS = require('os')
const scheduler = require("node-schedule");

metricsClient.socket.on("error", function (error) {
  console.error("Error loading metrics client: ", error);
});

const { CRON_SCHEDULE, STATSD_HOST, STATSD_PORT, JOB } = process.env

const statsDSettings = {
  host: STATSD_HOST,
  port: STATSD_PORT,
  globalTags: {
    instance: OS.hostname(),
    job: JOB
  }
};
metricsClient.connect(statsDSettings);

const initialize = async () => {
  try {
    await worker.loop();
  } catch (error) {
    console.log(error);
    process.emit('SIGINT');
  }
};


// # ┌───────────── minute (0 - 59)
// # │ ┌───────────── hour (0 - 23)
// # │ │ ┌───────────── day of the month (1 - 31)
// # │ │ │ ┌───────────── month (1 - 12)
// # │ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday to Saturday;
// # │ │ │ │ │                                   7 is also Sunday on some systems)
// # │ │ │ │ │
// # │ │ │ │ │
// # * * * * * command to execute
scheduler.scheduleJob(CRON_SCHEDULE, async () => {
  await initialize();
});


// Graceful Stop
// GNU/LINUX/UNIX Process Shutdown
process.on('SIGINT', () => {
  process.exit(0);
  metricsClient.closeConnection();
});

process.on('SIGTERM', () => {
  process.exit(0);
  metricsClient.closeConnection();
});

// WINDOWS Process Shutdown
process.on('message', msg => {
  if (msg == 'shutdown') {
    process.exit(0);
    metricsClient.closeConnection();
  }
});
