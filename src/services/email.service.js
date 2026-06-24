const sgMail = require('@sendgrid/mail');
const { env } = require('../config/env');

sgMail.setApiKey(env.SENDGRID_API_KEY);

function buildEmailHtml({ title, message, buttonText, buttonUrl, note }) {
    return `
        <div style="background-color: #F5F7FB; padding: 24px; font-family: Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                <tr>
                    <td align="center" style="padding-bottom: 16px;">
                        <img src="https://res.cloudinary.com/shehablotfallah/image/upload/w_1000,ar_16:9,c_fill,g_auto,e_sharpen/v1782187377/studivo/studivo_logo.png" 
                        alt="Studivo" width="140" style="display: block; border: none; outline: none; text-decoration: none;" />
                    </td>
                </tr>
                <tr>
                    <td style="background: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 44, 89, 0.08);">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="background-color: #0F2C59; padding: 28px 24px 20px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 24px; line-height: 32px; color: #FFFFFF; font-weight: 700;">${title}</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 28px 24px 16px; color: #25355A; font-size: 16px; line-height: 24px;">
                                    <p style="margin: 0 0 20px;">${message}</p>
                                    <div style="text-align: center; margin: 24px 0;">
                                        <a href="${buttonUrl}" style="background-color: #FF6B35; color: #FFFFFF; text-decoration: none; display: inline-block; padding: 14px 26px; border-radius: 12px; font-weight: 700;">${buttonText}</a>
                                    </div>
                                    <p style="margin: 0; color: #6B7A9D; font-size: 14px; line-height: 22px;">${note}</p>
                                    <p style="margin: 20px 0 0; color: #6B7A9D; font-size: 13px; line-height: 20px;">If the button does not work, copy and paste this link into your browser:<br /><a href="${buttonUrl}" style="color: #0F2C59; word-break: break-all;">${buttonUrl}</a></p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 20px 0 0; text-align: center; color: #8B96B3; font-size: 13px;">
                        <p style="margin: 0;">Studivo Team • Helping you discover your next great opportunity</p>
                    </td>
                </tr>
            </table>
        </div>
    `;
}

async function sendVerificationEmail(to, name, token) {
    const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;

    const msg = {
        to,
        from: {
            email: env.SENDGRID_FROM_EMAIL,
            name: 'Studivo Team',
        },
        subject: 'Verify your Studivo account',
        html: buildEmailHtml({
            title: `Welcome to Studivo, ${name}!`,
            message: 'Please confirm your email address to activate your Studivo account and start exploring the best offers and requests.',
            buttonText: 'Verify Email',
            buttonUrl: verificationUrl,
            note: 'This verification link is valid for 24 hours.',
        }),
    };

    await sgMail.send(msg);
}

async function sendPasswordResetEmail(to, name, token) {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

    const msg = {
        to,
        from: {
            email: env.SENDGRID_FROM_EMAIL,
            name: 'Studivo Team',
        },
        subject: 'Reset your Studivo password',
        html: buildEmailHtml({
            title: 'Password Reset Request',
            message: `Hi ${name}, we received a request to reset your Studivo password. Click the button below to continue.`,
            buttonText: 'Reset Password',
            buttonUrl: resetUrl,
            note: 'This password reset link will expire in 1 hour.',
        }),
    };

    await sgMail.send(msg);
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
};
