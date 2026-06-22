const sgMail  = require('@sendgrid/mail');
const { env } = require('../config/env');

sgMail.setApiKey(env.SENDGRID_API_KEY);

export async function sendVerificationEmail(to, name, token) {
    const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;

    const msg = {
        to,
        from: {
        email: env.SENDGRID_FROM_EMAIL,
        name:  'Studivo Team',
        },
        subject: 'Verify your Studivo account',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0F2C59;">Welcome to Studivo, ${name}!</h2>
            <p>Please verify your email address to get started.</p>
            <a href="${verificationUrl}"
            style="background-color: #FF6B35; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
            Verify Email
            </a>
            <p style="color: #666; font-size: 14px;">
            This link expires in 24 hours. If you didn't create an account, ignore this email.
            </p>
        </div>
        `,
    };

    await sgMail.send(msg);
}

    export async function sendPasswordResetEmail(to, name, token) {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

    const msg = {
        to,
        from: { email: env.SENDGRID_FROM_EMAIL, name: 'Studivo Team' },
        subject: 'Reset your Studivo password',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0F2C59;">Password Reset Request</h2>
            <p>Hi ${name}, click the button below to reset your password.</p>
            <a href="${resetUrl}"
            style="background-color: #FF6B35; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
            Reset Password
            </a>
            <p style="color: #666; font-size: 14px;">
            This link expires in 1 hour. If you didn't request this, ignore this email.
            </p>
        </div>
        `,
    };

    await sgMail.send(msg);
}