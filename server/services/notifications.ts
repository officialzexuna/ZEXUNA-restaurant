import nodemailer from 'nodemailer';

export interface NotificationResult {
  channel: 'EMAIL' | 'WHATSAPP';
  status: 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  providerMessageId?: string;
  error?: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_CLOUD_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

export async function sendEmailNotification(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<NotificationResult> {
  if (!isSmtpConfigured()) {
    return {
      channel: 'EMAIL',
      status: 'NOT_CONFIGURED',
      error: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured.',
    };
  }

  try {
    const port = Number(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return {
      channel: 'EMAIL',
      status: 'SENT',
      providerMessageId: info.messageId,
    };
  } catch (error) {
    return {
      channel: 'EMAIL',
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'SMTP delivery failed',
    };
  }
}

export async function sendWhatsAppCloudNotification(params: {
  toPhone: string;
  message: string;
}): Promise<NotificationResult> {
  if (!isWhatsAppCloudConfigured()) {
    return {
      channel: 'WHATSAPP',
      status: 'NOT_CONFIGURED',
      error: 'WhatsApp Business Cloud API credentials (WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID) are not configured.',
    };
  }

  try {
    const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const toDigits = params.toPhone.replace(/[^\d]/g, '');

    const resp = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toDigits,
        type: 'text',
        text: { body: params.message },
      }),
    });

    const data = (await resp.json()) as { messages?: Array<{ id: string }>; error?: { message?: string } };
    if (!resp.ok || !data.messages?.[0]?.id) {
      return {
        channel: 'WHATSAPP',
        status: 'FAILED',
        error: data.error?.message || `WhatsApp API error (${resp.status})`,
      };
    }

    return {
      channel: 'WHATSAPP',
      status: 'SENT',
      providerMessageId: data.messages[0].id,
    };
  } catch (error) {
    return {
      channel: 'WHATSAPP',
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'WhatsApp Cloud API request failed',
    };
  }
}
