import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SIGFAM <noreply@flotasugamuxi.co>';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'SIGFAM — Flota Sugamuxi';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SendEmailPayload {
  to: string | string[];
  subject: string;
  /** Raw text fallback */
  text?: string;
  /** HTML body */
  html?: string;
  /** Template key — generates the HTML automatically */
  template?: 'welcome' | 'password_reset' | 'expediente_update' | 'test';
  /** Template variables */
  variables?: Record<string, string>;
}

// ── HTML Templates ────────────────────────────────────────────────────────────
const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: #0d1117; color: #e6edf3; margin: 0; padding: 0;
`;
const CARD_STYLE = `
  max-width: 520px; margin: 40px auto; background: #161b22; border: 1px solid #30363d;
  border-radius: 12px; overflow: hidden;
`;
const HEADER_STYLE = `
  background: linear-gradient(135deg, hsl(221,83%,42%) 0%, hsl(224,76%,36%) 100%);
  padding: 32px 32px 24px; text-align: center;
`;
const BODY_STYLE = `padding: 32px;`;
const FOOTER_STYLE = `
  padding: 20px 32px; border-top: 1px solid #30363d; text-align: center;
  font-size: 11px; color: #8b949e;
`;
const BTN_STYLE = `
  display: inline-block; margin: 20px 0; padding: 12px 28px;
  background: hsl(221,83%,52%); color: #fff; text-decoration: none;
  border-radius: 8px; font-weight: 600; font-size: 14px;
`;

function buildHtml(body: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>
  <body style="${BASE_STYLE}">
    <div style="${CARD_STYLE}">
      <div style="${HEADER_STYLE}">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">SIGFAM</h1>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);">Flota Sugamuxi S.A. — Sistema Integrado de Gestión FAM</p>
      </div>
      <div style="${BODY_STYLE}">${body}</div>
      <div style="${FOOTER_STYLE}">
        <p>Este correo fue generado automáticamente por SIGFAM. No respondas a este mensaje.</p>
        <p style="margin-top:4px;">© ${new Date().getFullYear()} Flota Sugamuxi S.A. — Todos los derechos reservados.</p>
      </div>
    </div>
  </body></html>`;
}

function welcomeTemplate(vars: Record<string, string>): { subject: string; html: string } {
  const { nombre = 'Usuario', email = '', password = '', login_url = 'https://sigfam.flotasugamuxi.co' } = vars;
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#58a6ff;">¡Bienvenido a SIGFAM, ${nombre}!</h2>
    <p style="color:#8b949e;font-size:14px;margin:0 0 24px;">Tu cuenta ha sido creada por un administrador. Usa las credenciales a continuación para ingresar al sistema.</p>
    <div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;"><strong style="color:#8b949e;">Correo electrónico:</strong><br><span style="color:#e6edf3;">${email}</span></p>
      <p style="margin:0;font-size:13px;"><strong style="color:#8b949e;">Contraseña temporal:</strong><br><span style="font-family:monospace;font-size:15px;color:#ffa657;letter-spacing:1px;">${password || '(definida por el administrador)'}</span></p>
    </div>
    ${password ? '<p style="font-size:12px;color:#f85149;margin:0 0 20px;">⚠️ Deberás cambiar tu contraseña al iniciar sesión por primera vez.</p>' : ''}
    <a href="${login_url}" style="${BTN_STYLE}">Iniciar Sesión →</a>
    <p style="font-size:12px;color:#8b949e;margin-top:20px;">Si tienes problemas para acceder, contacta al administrador del sistema.</p>
  `;
  return { subject: `Bienvenido a SIGFAM — Tus credenciales de acceso`, html: buildHtml(body, 'Bienvenido a SIGFAM') };
}

function passwordResetTemplate(vars: Record<string, string>): { subject: string; html: string } {
  const { nombre = 'Usuario', password = '', admin_nombre = 'un administrador', login_url = 'https://sigfam.flotasugamuxi.co' } = vars;
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#ffa657;">Contraseña restablecida</h2>
    <p style="color:#8b949e;font-size:14px;margin:0 0 20px;">Hola <strong style="color:#e6edf3;">${nombre}</strong>, ${admin_nombre} ha restablecido tu contraseña en SIGFAM.</p>
    <div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;"><strong style="color:#8b949e;">Nueva contraseña temporal:</strong><br><span style="font-family:monospace;font-size:15px;color:#ffa657;letter-spacing:1px;">${password}</span></p>
    </div>
    <p style="font-size:12px;color:#f85149;margin:0 0 20px;">⚠️ Por seguridad, deberás cambiar esta contraseña al iniciar sesión.</p>
    <a href="${login_url}" style="${BTN_STYLE}">Iniciar Sesión →</a>
  `;
  return { subject: `SIGFAM — Tu contraseña ha sido restablecida`, html: buildHtml(body, 'Contraseña restablecida') };
}

function expedienteUpdateTemplate(vars: Record<string, string>): { subject: string; html: string } {
  const { numero = '', estado = '', descripcion = '', url = '' } = vars;
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#3fb950;">Actualización de Expediente</h2>
    <p style="color:#8b949e;font-size:14px;margin:0 0 20px;">El expediente <strong style="color:#e6edf3;">${numero}</strong> ha sido actualizado.</p>
    <div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:13px;"><strong style="color:#8b949e;">Estado:</strong> <span style="color:#3fb950;">${estado}</span></p>
      ${descripcion ? `<p style="margin:0;font-size:13px;color:#8b949e;">${descripcion}</p>` : ''}
    </div>
    ${url ? `<a href="${url}" style="${BTN_STYLE}">Ver Expediente →</a>` : ''}
  `;
  return { subject: `SIGFAM — Expediente ${numero}: ${estado}`, html: buildHtml(body, `Expediente ${numero}`) };
}

function testTemplate(): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#3fb950;">✅ Conexión de correo verificada</h2>
    <p style="color:#8b949e;font-size:14px;margin:0;">El servicio de correo de SIGFAM está funcionando correctamente con Resend.</p>
    <p style="font-size:12px;color:#8b949e;margin-top:16px;">Fecha de prueba: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
  `;
  return { subject: 'SIGFAM — Prueba de correo electrónico', html: buildHtml(body, 'Prueba de correo') };
}

// ── Handler ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Validate env
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY no está configurada en el servidor.' }, { status: 500 });
    }

    const payload: SendEmailPayload = await req.json();
    const { to, subject: customSubject, html: customHtml, text, template, variables = {} } = payload;

    if (!to) {
      return NextResponse.json({ error: 'El campo "to" es requerido.' }, { status: 400 });
    }

    let finalSubject = customSubject || 'Mensaje de SIGFAM';
    let finalHtml = customHtml || '';
    let finalText = text;

    // Resolve template
    if (template) {
      let generated: { subject: string; html: string };
      switch (template) {
        case 'welcome':
          generated = welcomeTemplate(variables);
          break;
        case 'password_reset':
          generated = passwordResetTemplate(variables);
          break;
        case 'expediente_update':
          generated = expedienteUpdateTemplate(variables);
          break;
        case 'test':
        default:
          generated = testTemplate();
          break;
      }
      finalSubject = generated.subject;
      finalHtml = generated.html;
    }

    if (!finalHtml && !finalText) {
      return NextResponse.json({ error: 'Debes proporcionar "html", "text" o un "template" válido.' }, { status: 400 });
    }

    const emailPayload: any = {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: finalSubject,
    };
    if (finalHtml) {
      emailPayload.html = finalHtml;
    } else if (finalText) {
      emailPayload.text = finalText;
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('[Resend] Error enviando correo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error('[Resend] Error inesperado:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
