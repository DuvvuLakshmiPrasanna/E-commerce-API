// Email worker - Processes async email jobs
const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-password',
  },
});

// Create worker to process email jobs
const emailWorker = new Worker('email-notifications', async (job) => {
  try {
    const { orderId, userEmail, userName, totalPrice, itemCount } = job.data;

    console.log(`Processing email job for order ${orderId}...`);

    // In production, you would send actual emails
    // For now, we'll simulate it
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
      to: userEmail,
      subject: `Order Confirmation - Order #${orderId}`,
      html: `
        <h2>Order Confirmation</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for your order!</p>
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <p><strong>Order Number:</strong> #${orderId}</p>
          <p><strong>Total Price:</strong> $${totalPrice}</p>
          <p><strong>Items:</strong> ${itemCount}</p>
          <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Your order has been received and will be processed shortly.</p>
        <p>Best regards,<br>E-Commerce Team</p>
      `,
    };

    // Simulate email sending (in production, use: await transporter.sendMail(mailOptions))
    console.log(`✓ Email notification for order ${orderId} would be sent to ${userEmail}`);
    console.log('Email content:', mailOptions);

    // Return job result
    return {
      success: true,
      orderId,
      email: userEmail,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to process email job:`, error);
    throw error;
  }
}, {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  concurrency: 5, // Process 5 emails concurrently
});

// Worker event handlers
emailWorker.on('completed', (job) => {
  console.log(`✓ Email job ${job.id} completed for order ${job.data.orderId}`);
});

emailWorker.on('failed', (job, error) => {
  console.error(`✗ Email job ${job.id} failed:`, error.message);
  // In production, you might want to retry or log to a service
});

emailWorker.on('error', (error) => {
  console.error('Worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down email worker...');
  await emailWorker.close();
  process.exit(0);
});

console.log('Email worker started, waiting for jobs...');
