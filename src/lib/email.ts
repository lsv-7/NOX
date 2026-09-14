export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // 1. Resend API Provider
  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddress = process.env.EMAIL_FROM || "NOX Skincare <orders@noxskincare.com>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("[Email] Resend delivery error:", errData);
        return { success: false, error: "Failed to send email via Resend" };
      }

      const data = await res.json();
      return { success: true, messageId: data.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Email] Delivery exception:", msg);
      return { success: false, error: msg };
    }
  }

  // 2. Non-production / local test fallback
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Email Mock/Dev] Dispatched email to: ${options.to}, Subject: "${options.subject}"`);
    return { success: true, messageId: "dev-mock-msg-id" };
  }

  // 3. In production without configured email provider
  console.warn("[Email Security Warning] No production email provider (RESEND_API_KEY, SMTP_HOST) is configured.");
  return {
    success: false,
    error: "Email delivery service is currently unconfigured.",
  };
}

export async function sendPasswordResetEmail(
  toEmail: string,
  customerName: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  const subject = "Reset Your NOX Password";
  const text = `Hello ${customerName},\n\nYou recently requested to reset your password for your NOX account.\n\nPlease visit the following link to reset your password:\n${resetUrl}\n\nThis link will expire in 15 minutes. If you did not request this, please ignore this email.\n\nWarm regards,\nNOX Skincare`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="background-color: #0D0E11; color: #F5F0E6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px;">
        <table align="center" width="100%" style="max-width: 560px; background-color: #08090B; border: 1px solid rgba(212,167,44,0.25); border-radius: 16px; padding: 36px;">
          <tr>
            <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid rgba(212,167,44,0.2);">
              <span style="font-family: serif; font-size: 28px; letter-spacing: 0.25em; color: #D4A72C; font-weight: 300;">NOX</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 0 16px 0;">
              <h2 style="font-family: serif; font-size: 20px; font-weight: 400; color: #F5F0E6; margin: 0 0 12px 0;">Password Reset Request</h2>
              <p style="font-size: 13px; color: #CFC5B4; line-height: 1.6; margin: 0 0 20px 0;">
                Hello ${customerName},<br/><br/>
                We received a request to reset the password for your NOX account. Click the button below to choose a new password.
              </p>
              <div align="center" style="margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #D4A72C; color: #0D0E11; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; display: inline-block;">
                  Reset My Password
                </a>
              </div>
              <p style="font-size: 11px; color: #8F8778; line-height: 1.5; margin: 24px 0 0 0;">
                For security reasons, this reset link expires in 15 minutes.<br/>
                If you did not request a password reset, no action is needed; your account remains secure.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(212,167,44,0.15); padding-top: 20px; text-align: center;">
              <p style="font-size: 10px; color: #666; letter-spacing: 0.1em; text-transform: uppercase; margin: 0;">
                NOX Skincare Private Limited • New Delhi, India
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
}