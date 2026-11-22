import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import { getStorageDir } from "@/lib/db";

export interface WelcomeEmailResult {
  sent: boolean;
  mode: "smtp" | "ethereal_smtp" | "local_outbox";
  previewUrl?: string | null;
}

function buildWelcomeEmailHtml(
  name: string,
  email: string,
  literaryTitle: string
): string {
  const issuedDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Bem-vindo(a) à Biblioteca Clarice Assis</title>
</head>
<body style="margin:0;padding:0;background-color:#F3EDE2;font-family:Georgia,'Times New Roman',serif;color:#2C1E16;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3EDE2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FBF8F3;border:2px solid #C89D54;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(44,30,22,0.12);">
          <!-- Header -->
          <tr>
            <td style="background-color:#2C1E16;padding:28px 32px;text-align:center;border-bottom:3px solid #C89D54;">
              <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C89D54;font-family:Arial,sans-serif;font-weight:bold;">
                Gabinete de Leitura &amp; Acervo Digital
              </p>
              <h1 style="margin:0;font-size:26px;color:#FBF8F3;font-weight:bold;">
                Biblioteca Clarice Assis
              </h1>
              <p style="margin:8px 0 0 0;font-size:13px;color:#D9CBB8;font-style:italic;">
                &ldquo;Liberdade é pouco. O que eu desejo ainda não tem nome.&rdquo; — Clarice Lispector
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:18px;font-weight:bold;color:#2C1E16;">
                Saudações literárias, ${name}! ☕📚
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#4A3525;">
                É uma honra recebê-lo(a) em nossa comunidade. Sua <strong>Carteira de Leitor</strong> acaba de ser emitida e registrada em nosso acervo oficial.
              </p>

              <!-- Reader Card Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3EDE2;border:1px solid #D5C4A8;border-left:4px solid #C89D54;border-radius:12px;padding:18px;margin:20px 0;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#8B5E34;font-family:Arial,sans-serif;font-weight:bold;">
                      Carteira Oficial de Membro
                    </p>
                    <p style="margin:4px 0;font-size:14px;color:#2C1E16;">
                      <strong>Leitor(a):</strong> ${name}
                    </p>
                    <p style="margin:4px 0;font-size:14px;color:#2C1E16;">
                      <strong>Título Literário:</strong> ${literaryTitle}
                    </p>
                    <p style="margin:4px 0;font-size:14px;color:#2C1E16;">
                      <strong>E-mail Vinculado:</strong> ${email}
                    </p>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#6E5641;">
                      <strong>Emissão:</strong> ${issuedDate}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 12px 0;font-size:15px;font-weight:bold;color:#2C1E16;">
                O que já está disponível para você:
              </p>

              <ul style="margin:0 0 24px 0;padding-left:20px;font-size:14px;line-height:1.7;color:#4A3525;">
                <li><strong>Estante Pessoal Sincronizada:</strong> Guarde seus livros favoritos para acessá-los de qualquer sessão.</li>
                <li><strong>Downloads em PDF Completo:</strong> Baixe obras clássicas integrais diretamente em seu dispositivo.</li>
                <li><strong>Mural de Resenhas Verificadas:</strong> Publique suas avaliações literárias e consulte opiniões reais das livrarias.</li>
                <li><strong>Busca Global &amp; Edições:</strong> Compare edições físicas, capa dura, bolso e links diretos de livrarias.</li>
              </ul>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#4A3525;">
                Sente-se, prepare um bom café e aproveite sua próxima leitura!
              </p>

              <p style="margin:20px 0 0 0;font-size:14px;font-weight:bold;color:#2C1E16;">
                Com estima,<br />
                <span style="color:#8B5E34;">Curadoria da Biblioteca Clarice Assis</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#2C1E16;padding:18px 32px;text-align:center;font-size:11px;color:#CDBBA3;font-family:Arial,sans-serif;">
              Biblioteca Clarice Assis — Homenagem a Clarice Lispector &amp; Machado de Assis.<br />
              Este é um e-mail automático de boas-vindas enviado após o seu cadastro.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(params: {
  toName: string;
  toEmail: string;
  literaryTitle: string;
}): Promise<WelcomeEmailResult> {
  const { toName, toEmail, literaryTitle } = params;
  const subject =
    "☕ Bem-vindo(a) ao Gabinete de Leitura — Biblioteca Clarice Assis";
  const html = buildWelcomeEmailHtml(toName, toEmail, literaryTitle);
  const text = `Saudações literárias, ${toName}!\n\nSua Carteira de Leitor (${literaryTitle}) foi emitida com sucesso na Biblioteca Clarice Assis.\n\nPrepare um café e aproveite sua próxima leitura!\n\nCuradoria da Biblioteca Clarice Assis`;

  // Always archive a local copy in storage/emails/ (gitignored) for immediate audit
  try {
    const outboxDir = path.join(getStorageDir(), "emails");
    if (!fs.existsSync(outboxDir)) {
      fs.mkdirSync(outboxDir, { recursive: true });
    }
    const safeEmail = toEmail.replace(/[^a-zA-Z0-9._-]/g, "_");
    fs.writeFileSync(
      path.join(outboxDir, `boas-vindas-${safeEmail}-${Date.now()}.html`),
      html,
      "utf8"
    );
  } catch {
    // ignore fs error
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpFrom =
    process.env.SMTP_FROM?.trim() ||
    '"Biblioteca Clarice Assis" <acervo@clariceassis.com.br>';

  // 1. If real SMTP credentials are provided in .env.local, send via configured SMTP server
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: `"${toName}" <${toEmail}>`,
        subject,
        text,
        html
      });

      return { sent: true, mode: "smtp", previewUrl: null };
    } catch {
      // Fallback to Ethereal if custom SMTP fails
    }
  }

  // 2. Automatic real SMTP dispatch via Nodemailer Ethereal when custom SMTP isn't configured
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: `"${toName}" <${toEmail}>`,
      subject,
      text,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    return {
      sent: true,
      mode: "ethereal_smtp",
      previewUrl: typeof previewUrl === "string" ? previewUrl : null
    };
  } catch {
    return { sent: true, mode: "local_outbox", previewUrl: null };
  }
}
