import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Env } from '../config/env.js';

const texts = {
  fr: {
    subject: 'Réinitialisez votre mot de passe',
    hello: (name: string) => `Bonjour ${name},`,
    body: 'Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable 30 minutes.',
    button: 'Choisir un nouveau mot de passe',
    ignore: 'Si vous n’avez rien demandé, ignorez simplement cet e-mail.',
  },
  en: {
    subject: 'Reset your password',
    hello: (name: string) => `Hi ${name},`,
    body: 'Click the button below to choose a new password. This link is valid for 30 minutes.',
    button: 'Choose a new password',
    ignore: 'If you didn’t ask for this, you can simply ignore this email.',
  },
};

interface Email {
  to: string;
  subject: string;
  html: string;
}

// SMTP (Gmail with an app password works fine) or Resend. If neither is
// set up, the link is only logged, which is enough for local development.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async sendPasswordReset(to: string, name: string, link: string, language: 'fr' | 'en') {
    const t = texts[language];
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0b0a10">
        <h2 style="color:#7c3aed">ExpenseControl</h2>
        <p>${t.hello(escapeHtml(name))}</p>
        <p>${t.body}</p>
        <p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">${t.button}</a></p>
        <p style="color:#6b6375;font-size:13px">${t.ignore}</p>
      </div>`;

    const sent = await this.send({ to, subject: t.subject, html });
    if (!sent && this.config.get('NODE_ENV', { infer: true }) !== 'production') {
      this.logger.warn(`Password reset link for ${to}: ${link}`);
    }
  }

  private async send(email: Email) {
    try {
      if (this.config.get('SMTP_USER', { infer: true })) return await this.sendWithSmtp(email);
      if (this.config.get('RESEND_API_KEY', { infer: true })) return await this.sendWithResend(email);
      this.logger.warn('Email is not configured');
    } catch (error) {
      this.logger.error(`Email not sent: ${String(error)}`);
    }
    return false;
  }

  private async sendWithSmtp(email: Email) {
    const user = this.config.get('SMTP_USER', { infer: true });
    const transport = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', { infer: true }),
      port: this.config.get('SMTP_PORT', { infer: true }),
      secure: this.config.get('SMTP_PORT', { infer: true }) === 465,
      auth: { user, pass: this.config.get('SMTP_PASS', { infer: true }) },
    });
    const from = this.config.get('MAIL_FROM', { infer: true }) || `ExpenseControl <${user}>`;
    await transport.sendMail({ ...email, from });
    return true;
  }

  private async sendWithResend(email: Email) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.get('RESEND_API_KEY', { infer: true })}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...email, from: this.config.get('MAIL_FROM', { infer: true }) }),
    });
    if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
    return true;
  }
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
