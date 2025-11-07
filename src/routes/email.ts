import { Request, Response } from 'express';

export async function handleEmail(req: Request, res: Response) {
  try {
    const { name, subject, email, message } = req.body;

    if (!name || !subject || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields: name, subject, email, message'
      });
    }

    // TODO: Implement actual email sending
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ ... });

    return res.json({
      success: true,
      message: 'Email would be sent here',
      preview: {
        to: process.env.CONTACT_EMAIL || 'contact@example.com',
        from: email,
        subject: subject,
        text: `From: ${name} (${email})\n\n${message}`,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

