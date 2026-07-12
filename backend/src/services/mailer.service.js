const nodemailer = require('nodemailer');

class MailerService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    // Only initialize if SMTP credentials are provided
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('[Mailer] SMTP Transporter initialized.');
    } else {
      console.warn('[Mailer] Missing SMTP configuration. Emails will be logged to console instead of sent.');
    }
  }

  /**
   * Generates HTML payload and sends email for expiring licenses
   * @param {Array} drivers 
   * @param {String} toEmail 
   */
  async sendLicenseReminderEmail(drivers, toEmail) {
    if (!drivers || drivers.length === 0) return;

    const expired = drivers.filter(d => d.expiry_state === 'EXPIRED');
    const expiringSoon = drivers.filter(d => d.expiry_state === 'EXPIRING_SOON');

    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">TransitOps License Expiration Alert</h2>
        <p>This is an automated reminder regarding driver licenses that have expired or are expiring within the next 30 days.</p>
    `;

    if (expired.length > 0) {
      htmlContent += `
        <h3 style="color: #DC2626; border-bottom: 2px solid #DC2626; padding-bottom: 5px;">⚠️ EXPIRED LICENSES (${expired.length})</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f8d7da; text-align: left;">
            <th style="padding: 8px; border: 1px solid #f5c2c7;">Name</th>
            <th style="padding: 8px; border: 1px solid #f5c2c7;">License #</th>
            <th style="padding: 8px; border: 1px solid #f5c2c7;">Expired On</th>
          </tr>
      `;
      expired.forEach(d => {
        htmlContent += `
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${d.name}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${d.license_number}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6; color: #DC2626; font-weight: bold;">${new Date(d.license_expiry_date).toLocaleDateString()}</td>
          </tr>
        `;
      });
      htmlContent += `</table>`;
    }

    if (expiringSoon.length > 0) {
      htmlContent += `
        <h3 style="color: #D97706; border-bottom: 2px solid #D97706; padding-bottom: 5px;">⏳ EXPIRING SOON (${expiringSoon.length})</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #fff3cd; text-align: left;">
            <th style="padding: 8px; border: 1px solid #ffecb5;">Name</th>
            <th style="padding: 8px; border: 1px solid #ffecb5;">License #</th>
            <th style="padding: 8px; border: 1px solid #ffecb5;">Expires In</th>
          </tr>
      `;
      expiringSoon.forEach(d => {
        htmlContent += `
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${d.name}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${d.license_number}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${d.days_remaining} days (${new Date(d.license_expiry_date).toLocaleDateString()})</td>
          </tr>
        `;
      });
      htmlContent += `</table>`;
    }

    htmlContent += `
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          Please log into the TransitOps dashboard to update these records. <br/>
          <em>This is an automated message, please do not reply.</em>
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"TransitOps System" <${process.env.SMTP_USER || 'noreply@transitops.com'}>`,
      to: toEmail,
      subject: `🚨 Action Required: ${drivers.length} Driver Licenses Expiring/Expired`,
      html: htmlContent
    };

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`[Mailer] License reminder email sent to ${toEmail}. Message ID: ${info.messageId}`);
      } catch (error) {
        console.error('[Mailer] Failed to send email:', error.message);
      }
    } else {
      console.log(`\n==========================================`);
      console.log(`[MOCK EMAIL DISPATCH] To: ${toEmail}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Found ${expired.length} expired and ${expiringSoon.length} expiring soon.`);
      console.log(`(Configure SMTP in .env to send real emails)`);
      console.log(`==========================================\n`);
    }
  }
}

module.exports = new MailerService();
