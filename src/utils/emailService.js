import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendOTP = async (email, otp, type = 'Verification') => {
    const mailOptions = {
        from: `"MediCare Support" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}

This code will expire in 10 minutes.
If you did not request this, ignore this email.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #1E3A8A; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">${type}</h1>
                </div>
                <div style="padding: 20px;">
                    <p>Hello,</p>
                    <p>Your verification code is:</p>
                    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1E3A8A;">${otp}</span>
                    </div>
                    <p>This code expires in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.</p>
                </div>
                <div style="background-color: #f9fafb; color: #6b7280; padding: 20px; text-align: center; font-size: 12px;">
                    &copy; 2026 MediCare Pharmacy. All rights reserved.
                </div>
            </div>
        `,
    };

    return transporter.sendMail(mailOptions);
};
