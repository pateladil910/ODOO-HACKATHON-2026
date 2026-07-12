const cron = require('node-cron');
const DriverModel = require('../models/driver.model');
const mailerService = require('../services/mailer.service');

class LicenseReminderJob {
  /**
   * Initializes and schedules the cron job
   */
  start() {
    // Schedule to run every day at 08:00 AM server time
    // '0 8 * * *' means "At 08:00 on every day-of-month"
    cron.schedule('0 8 * * *', async () => {
      console.log('[Cron] Executing LicenseReminderJob...');
      await this.execute();
    }, {
      scheduled: true,
      timezone: "UTC" // Or whatever timezone the server expects
    });

    console.log('[Cron] LicenseReminderJob scheduled to run daily at 08:00 AM UTC.');
  }

  /**
   * Core execution logic of the job
   */
  async execute() {
    try {
      const expiringDrivers = await DriverModel.findExpiringLicenses();
      
      if (expiringDrivers && expiringDrivers.length > 0) {
        const recipient = process.env.ALERT_RECIPIENT_EMAIL || 'admin@transitops.com';
        await mailerService.sendLicenseReminderEmail(expiringDrivers, recipient);
        console.log(`[Cron] LicenseReminderJob finished. Sent alert for ${expiringDrivers.length} drivers.`);
      } else {
        console.log('[Cron] LicenseReminderJob finished. No expiring licenses found today.');
      }
    } catch (error) {
      console.error('[Cron] Error executing LicenseReminderJob:', error);
    }
  }
}

module.exports = new LicenseReminderJob();
