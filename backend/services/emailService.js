const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter using ethereal email (a mock email service for testing)
  // Or configure for real email service like Gmail, Sendgrid etc.
  
  // For production, you'd use something like:
  /*
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  */
  
  // Using ethereal for safe development
  let testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  const message = {
    from: `${process.env.FROM_NAME || 'Hostel Mess Finder'} <${process.env.FROM_EMAIL || 'noreply@hostelmessfinder.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
  // Preview only available when sending through an Ethereal account
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
};

module.exports = sendEmail;
