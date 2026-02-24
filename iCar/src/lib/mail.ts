import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendApprovalEmail(email: string, name: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"iCar" <noreply@icar.com>',
    to: email,
    subject: 'Congratulations! Your Dealer Application has been Approved',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Welcome to iCar!</h2>
        <p>Dear ${name},</p>
        <p>We are thrilled to inform you that your application to become a dealer on iCar has been <strong>approved</strong>.</p>
        <p>You can now log in to the dealer portal and start managing your listings.</p>
        <div style="margin: 30px 0;">
          <a href="${APP_URL}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Dealer Portal</a>
        </div>
        <p>Best regards,<br/>The iCar Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendRejectionEmail(email: string, name: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"iCar" <noreply@icar.com>',
    to: email,
    subject: 'Update Regarding Your Dealer Application',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #6b7280;">Application Update</h2>
        <p>Dear ${name},</p>
        <p>Thank you for your interest in joining iCar.</p>
        <p>After carefully reviewing your application, we regret to inform you that we are unable to approve your dealer registration at this time.</p>
        <p>If you have any questions or would like to re-apply in the future with more details, please feel free to contact our support team.</p>
        <p>Best regards,<br/>The iCar Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendAlertNotificationEmail(email: string, name: string, alert: any, matches: any[]) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"iCar" <noreply@icar.com>',
    to: email,
    subject: `Car Alert: ${matches.length} matches found for ${alert.make} ${alert.model}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">New Matches for Your Alert</h2>
        <p>Dear ${name},</p>
        <p>We found ${matches.length} matching listings for your alert: <strong>${alert.make} ${alert.model} (${alert.region})</strong>.</p>
        
        <div style="margin: 20px 0;">
          ${matches.map(match => {
            // Internal listings have an `id` (cuid string) but no `url`/`listing_url`
            // Scraper listings have a `url` or `listing_url` field pointing to external site
            const externalUrl = match.url || match.listing_url || null;
            const listingUrl = externalUrl
              ? externalUrl
              : match.id ? `${APP_URL}/listings/${match.id}` : '#';
            const title = match.title || `${match.make} ${match.model} ${match.year || ''}`.trim();
            const source = externalUrl ? 'External' : 'iCar';
            return `
            <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                <h3 style="margin: 0; color: #111827; font-size: 16px;">${title}</h3>
                <span style="font-size: 11px; background: ${match.url ? '#fef3c7' : '#ede9fe'}; color: ${match.url ? '#92400e' : '#5b21b6'}; padding: 2px 8px; border-radius: 99px; white-space: nowrap; margin-left: 8px;">${source}</span>
              </div>
              <p style="margin: 4px 0; color: #4b5563; font-size: 14px;">
                ${match.price ? `<strong>${match.price} ${match.currency || 'AED'}</strong> &nbsp;|&nbsp;` : ''}
                ${match.year ? `Year: ${match.year}` : ''}
                ${match.mileage ? ` &nbsp;|&nbsp; ${match.mileage.toLocaleString()} KM` : ''}
              </p>
              <a href="${listingUrl}" style="display: inline-block; margin-top: 8px; color: #4f46e5; text-decoration: none; font-weight: 600; font-size: 14px;">View Listing →</a>
            </div>`;
          }).join('')}
        </div>

        <div style="margin: 30px 0;">
          <a href="${APP_URL}/alerts" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Manage Your Alerts</a>
        </div>
        <p>Best regards,<br/>The iCar Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
