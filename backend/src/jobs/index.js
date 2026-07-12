const licenseReminderJob = require('./licenseReminder.job');

/**
 * Bootstraps all background cron jobs for the application
 */
const initJobs = () => {
  console.log('[System] Initializing background jobs...');
  
  // Start the license expiration reminder cron job
  licenseReminderJob.start();

  // Any future jobs can be started here
};

module.exports = { initJobs };
