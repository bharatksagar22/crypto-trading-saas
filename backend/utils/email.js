const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email
const sendEmail = async (options) => {
  const transporter = createTransporter();

  const message = {
    from: `${process.env.FROM_NAME || 'Crypto Trading SaaS'} <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html || options.message
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Crypto Trading SaaS!</h2>
      <p>Hi ${user.name},</p>
      <p>Thank you for registering with our AI-powered crypto trading platform.</p>
      <p>Your account is currently pending admin approval. You will receive another email once your account is approved.</p>
      <p>In the meantime, you can:</p>
      <ul>
        <li>Explore our platform features</li>
        <li>Read our trading strategies documentation</li>
        <li>Join our community Discord server</li>
      </ul>
      <p>Best regards,<br>The Crypto Trading Team</p>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: 'Welcome to Crypto Trading SaaS - Account Pending Approval',
    html
  });
};

// Send account approval email
const sendApprovalEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Account Approved!</h2>
      <p>Hi ${user.name},</p>
      <p>Great news! Your account has been approved and you can now start trading.</p>
      <p>Next steps:</p>
      <ol>
        <li>Log in to your dashboard</li>
        <li>Connect your Delta Exchange API keys</li>
        <li>Configure your trading strategies</li>
        <li>Start your AI trading journey!</li>
      </ol>
      <p><a href="${process.env.FRONTEND_URL}/login" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Dashboard</a></p>
      <p>Best regards,<br>The Crypto Trading Team</p>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: 'Account Approved - Start Trading Now!',
    html
  });
};

// Send daily PnL report
const sendDailyReport = async (user, reportData) => {
  const { totalPnL, totalTrades, winRate, topStrategies } = reportData;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Daily Trading Report</h2>
      <p>Hi ${user.name},</p>
      <p>Here's your daily trading summary:</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Performance Summary</h3>
        <p><strong>Total P&L:</strong> ₹${totalPnL.toFixed(2)}</p>
        <p><strong>Total Trades:</strong> ${totalTrades}</p>
        <p><strong>Win Rate:</strong> ${winRate.toFixed(1)}%</p>
      </div>
      
      ${topStrategies.length > 0 ? `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Top Performing Strategies</h3>
          ${topStrategies.map(strategy => `
            <p><strong>${strategy.name}:</strong> ₹${strategy.pnl.toFixed(2)} (${strategy.trades} trades)</p>
          `).join('')}
        </div>
      ` : ''}
      
      <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Full Dashboard</a></p>
      <p>Keep up the great work!</p>
      <p>Best regards,<br>The Crypto Trading Team</p>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: `Daily Trading Report - P&L: ₹${totalPnL.toFixed(2)}`,
    html
  });
};

// Send payment confirmation
const sendPaymentConfirmation = async (user, payment) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Payment Confirmed!</h2>
      <p>Hi ${user.name},</p>
      <p>Your payment has been successfully processed.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Payment Details</h3>
        <p><strong>Plan:</strong> ${payment.planType.toUpperCase()}</p>
        <p><strong>Duration:</strong> ${payment.planDuration} month(s)</p>
        <p><strong>Amount:</strong> ₹${payment.finalAmount}</p>
        <p><strong>Payment ID:</strong> ${payment.razorpayPaymentId}</p>
      </div>
      
      <p>Your subscription is now active and you can enjoy all the premium features.</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
      <p>Best regards,<br>The Crypto Trading Team</p>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: 'Payment Confirmed - Subscription Activated',
    html
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendApprovalEmail,
  sendDailyReport,
  sendPaymentConfirmation
};

