import nodemailer from 'nodemailer';
import { supabase } from './supabase';

interface SendVerificationEmailParams {
  email: string;
  activationLink: string;
}

interface SendWelcomeEmailParams {
  email: string;
  nickname: string;
  password: string;
  loginUrl: string;
  siteUrl: string;
  siteName: string;
}

async function getMailSettings() {
  const { data, error } = await supabase
    .from('mail_settings')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error('SMTP設定が見つかりません');
  }

  return data;
}

async function getMailTemplate(templateKey: string) {
  const { data, error } = await supabase
    .from('mail_templates')
    .select('*')
    .eq('template_key', templateKey)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error(`メールテンプレート「${templateKey}」が見つかりません`);
  }

  return data;
}

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

export async function sendVerificationEmail({ email, activationLink }: SendVerificationEmailParams) {
  try {
    const settings = await getMailSettings();
    const template = await getMailTemplate('verification_email');

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.use_ssl,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    // テンプレート変数を置換
    const subject = replaceTemplateVariables(template.subject, {
      activationLink,
    });

    const body = replaceTemplateVariables(template.body, {
      activationLink,
    });

    const info = await transporter.sendMail({
      from: `"${settings.from_name}" <${settings.from_email}>`,
      to: email,
      subject,
      html: body,
    });

    console.log('Verification email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function sendWelcomeEmail({ 
  email, 
  nickname, 
  password, 
  loginUrl,
  siteUrl,
  siteName 
}: SendWelcomeEmailParams) {
  try {
    const settings = await getMailSettings();
    const template = await getMailTemplate('welcome_email');

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.use_ssl,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    // テンプレート変数を置換
    const subject = replaceTemplateVariables(template.subject, {
      nickname,
      email,
      password,
      loginUrl,
      siteUrl,
      siteName,
    });

    const body = replaceTemplateVariables(template.body, {
      nickname,
      email,
      password,
      loginUrl,
      siteUrl,
      siteName,
    });

    const info = await transporter.sendMail({
      from: `"${settings.from_name}" <${settings.from_email}>`,
      to: email,
      subject,
      html: body,
    });

    console.log('Welcome email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

interface SendPasswordResetEmailParams {
  email: string;
  resetUrl: string;
  userName?: string;
}

export async function sendPasswordResetEmail({ email, resetUrl, userName }: SendPasswordResetEmailParams) {
  try {
    const settings = await getMailSettings();
    const template = await getMailTemplate('password_reset_email');

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.use_ssl,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    // テンプレート変数を置換
    const subject = replaceTemplateVariables(template.subject, {
      userName: userName || '',
      resetUrl,
    });

    const body = replaceTemplateVariables(template.body, {
      userName: userName || '',
      resetUrl,
    });

    const info = await transporter.sendMail({
      from: `"${settings.from_name}" <${settings.from_email}>`,
      to: email,
      subject,
      html: body,
    });

    console.log('Password reset email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Password reset email send error:', error);
    return { success: false, error };
  }
}
