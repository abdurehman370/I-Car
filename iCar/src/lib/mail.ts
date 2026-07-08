import nodemailer from 'nodemailer';
import { formatAuctionDateTime, getAuctionTimezoneLabel } from '@/lib/auction-datetime';

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
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: email,
    subject: 'Congratulations! Your Dealer Application has been Approved',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Welcome to CarQ!</h2>
        <p>Dear ${name},</p>
        <p>We are thrilled to inform you that your application to become a dealer on CarQ has been <strong>approved</strong>.</p>
        <p>You can now log in to the dealer portal and start managing your listings.</p>
        <div style="margin: 30px 0;">
          <a href="${APP_URL}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Dealer Portal</a>
        </div>
        <p>Best regards,<br/>The CarQ Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendRejectionEmail(email: string, name: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: email,
    subject: 'Update Regarding Your Dealer Application',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #6b7280;">Application Update</h2>
        <p>Dear ${name},</p>
        <p>Thank you for your interest in joining CarQ.</p>
        <p>After carefully reviewing your application, we regret to inform you that we are unable to approve your dealer registration at this time.</p>
        <p>If you have any questions or would like to re-apply in the future with more details, please feel free to contact our support team.</p>
        <p>Best regards,<br/>The CarQ Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendDealerSignupEmail(email: string, name: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: email,
    subject: 'Welcome to CarQ! Your Application is Received',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Welcome to CarQ!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for signing up to become a dealer on CarQ.</p>
        <p>We have successfully received your application. Our admin team will review your details and license document shortly.</p>
        <p>You will receive another email once your application has been approved.</p>
        <p>Best regards,<br/>The CarQ Team</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

export async function sendAdminNewDealerEmail(adminEmail: string, dealerName: string, dealershipName: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: adminEmail,
    subject: 'New Dealer Application Received',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">New Dealer Signup</h2>
        <p>A new dealer has signed up and is waiting for approval.</p>
        <p><strong>Contact Person:</strong> ${dealerName}</p>
        <p><strong>Dealership Name:</strong> ${dealershipName}</p>
        <div style="margin: 30px 0;">
          <a href="${APP_URL}/admin/dealers" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Application</a>
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

export async function sendAlertNotificationEmail(email: string, name: string, alert: any, matches: any[]) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
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
            const source = externalUrl ? 'External' : 'CarQ';
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
        <p>Best regards,<br/>The CarQ Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendAuctionPublishedEmail(email: string, name: string, auction: any) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: email,
    subject: `New Auction: ${auction.year} ${auction.make} ${auction.model}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">New Auction Published</h2>
        <p>Dear ${name},</p>
        <p>A new vehicle has been listed for auction on CarQ.</p>
        <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #111827;">${auction.year} ${auction.make} ${auction.model} ${auction.variant || ''}</h3>
          <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Region:</strong> ${auction.region} - ${auction.city || ''}</p>
          <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Mileage:</strong> ${auction.mileage} KM</p>
          <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Starting Bid:</strong> ${auction.startingBid} ${auction.currency}</p>
          <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Starts at:</strong> ${formatAuctionDateTime(auction.startAt, auction.region)} (${getAuctionTimezoneLabel(auction.region)})</p>
          <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Ends at:</strong> ${formatAuctionDateTime(auction.endAt, auction.region)} (${getAuctionTimezoneLabel(auction.region)})</p>
        </div>
        <div style="margin: 30px 0;">
          <a href="${APP_URL}/auctions/${auction.id}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Auction</a>
        </div>
        <p>Best regards,<br/>The CarQ Team</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

export async function sendAuctionStartedEmail(email: string, name: string, auction: any) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: email,
    subject: `Auction Started: ${auction.year} ${auction.make} ${auction.model}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Live Auction Started!</h2>
        <p>Dear ${name},</p>
        <p>The auction for <strong>${auction.year} ${auction.make} ${auction.model}</strong> is now live. Place your bids before the auction closes!</p>
        <div style="margin: 30px 0;">
          <a href="${APP_URL}/auctions/${auction.id}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Bid Now</a>
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

export async function sendAuctionOutbidEmail(email: string, name: string, auction: any, newHighestBid: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: email,
    subject: `You have been outbid on ${auction.make} ${auction.model}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ef4444;">You have been outbid!</h2>
        <p>Dear ${name},</p>
        <p>Someone has placed a higher bid on the <strong>${auction.year} ${auction.make} ${auction.model}</strong>.</p>
        <p>The current highest bid is now <strong>${newHighestBid} ${auction.currency}</strong>.</p>
        <div style="margin: 30px 0;">
          <a href="${APP_URL}/auctions/${auction.id}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Increase Your Bid</a>
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

export async function sendAuctionWonEmail(email: string, name: string, auction: any, amount: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: email,
    subject: `Congratulations! You won the auction for ${auction.make} ${auction.model}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #10b981;">Auction Won!</h2>
        <p>Dear ${name},</p>
        <p>Congratulations! You have successfully won the auction for <strong>${auction.year} ${auction.make} ${auction.model}</strong> with a final bid of <strong>${amount} ${auction.currency}</strong>.</p>
        <p>Our team will contact you shortly regarding the next steps.</p>
        <div style="margin: 30px 0;">
          <a href="${APP_URL}/auctions/${auction.id}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Details</a>
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

export async function sendAuctionClosedEmail(email: string, name: string, auction: any, outcome: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: email,
    subject: `Auction Ended: ${auction.year} ${auction.make} ${auction.model}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #6b7280;">Auction Closed</h2>
        <p>Dear ${name},</p>
        <p>The auction for <strong>${auction.year} ${auction.make} ${auction.model}</strong> has ended.</p>
        <p>Result: ${outcome === 'sold' ? 'Sold' : outcome === 'reserve_not_met' ? 'Reserve Not Met' : 'No Bids'}</p>
        <div style="margin: 30px 0;">
          <a href="${APP_URL}/auctions/${auction.id}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Auction</a>
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

export async function sendAuctionCancelledEmail(email: string, name: string, auction: any) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CarQ" <noreply@carq.me>',
    to: email,
    subject: `Auction Cancelled: ${auction.year} ${auction.make} ${auction.model}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ef4444;">Auction Cancelled</h2>
        <p>Dear ${name},</p>
        <p>We regret to inform you that the auction for <strong>${auction.year} ${auction.make} ${auction.model}</strong> has been cancelled.</p>
        <p>If you placed any bids on this auction, they have been invalidated.</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}
