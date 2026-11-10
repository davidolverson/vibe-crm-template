/**
 * email-templates.ts
 *
 * Lightweight template renderer + built-in default templates for key CRM events.
 * All HTML uses inline styles so it survives every major email client.
 */

// ---------------------------------------------------------------------------
// HTML escaping (prevents injection in email templates)
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

/**
 * Replace {{variable}} tokens in a template string with values from a map.
 * Unknown tokens are left intact so they're visible in the rendered output.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match;
  });
}

// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1A1A2E;padding:24px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">VIBE</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you have a VIBE account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Built-in templates
// ---------------------------------------------------------------------------

/**
 * Welcome email sent to a new user after workspace provisioning.
 */
export function welcomeEmail(userName: string): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const safe = escapeHtml(userName);
  const subject = 'Welcome to VIBE';

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">
      Welcome, ${safe}!
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Your VIBE workspace is ready. You can now manage contacts, track deals,
      capture leads, and automate your follow-ups -- all in one place.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'}/dashboard"
       style="display:inline-block;background:#1A1A2E;color:#ffffff;text-decoration:none;
              padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">
      Go to Dashboard
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
      If you have any questions, just reply to this email.
    </p>
  `;

  const textBody = `Welcome to VIBE, ${safe}!\n\nYour workspace is ready. Visit your dashboard at ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'}/dashboard`;

  return { subject, htmlBody: layout(subject, bodyHtml), textBody };
}

/**
 * Alert sent to the tenant owner when a new lead submits a form.
 */
export function formSubmissionAlert(
  formName: string,
  contactName: string,
  contactEmail: string,
): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const safeForm = escapeHtml(formName);
  const safeName = escapeHtml(contactName);
  const safeEmail = contactEmail ? escapeHtml(contactEmail) : 'Not provided';
  const subject = `New lead from "${formName}"`;

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      You have a new lead
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Someone just submitted your <strong>${safeForm}</strong> form.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#f9fafb;">
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#374151;width:140px;">Name</td>
        <td style="padding:10px 16px;font-size:14px;color:#111827;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#374151;border-top:1px solid #e5e7eb;">Email</td>
        <td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${safeEmail}</td>
      </tr>
    </table>
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'}/contacts"
       style="display:inline-block;background:#1A1A2E;color:#ffffff;text-decoration:none;
              padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">
      View Contact
    </a>
  `;

  const textBody = `New lead from "${formName}"\n\nName: ${contactName}\nEmail: ${contactEmail || 'Not provided'}\n\nView contacts at ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'}/contacts`;

  return { subject, htmlBody: layout(subject, bodyHtml), textBody };
}

/**
 * Reminder sent when a task is approaching its due date.
 */
export function taskDueReminder(taskTitle: string, dueDate: string): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const safeTitle = escapeHtml(taskTitle);
  const safeDate = escapeHtml(dueDate);
  const subject = `Task due: ${taskTitle}`;

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      Your task is due soon
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      A reminder that the following task is coming up:
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#f9fafb;">
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#374151;width:100px;">Task</td>
        <td style="padding:10px 16px;font-size:14px;color:#111827;">${safeTitle}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#374151;border-top:1px solid #e5e7eb;">Due</td>
        <td style="padding:10px 16px;font-size:14px;color:#dc2626;font-weight:600;border-top:1px solid #e5e7eb;">${safeDate}</td>
      </tr>
    </table>
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'}/tasks"
       style="display:inline-block;background:#1A1A2E;color:#ffffff;text-decoration:none;
              padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">
      View Tasks
    </a>
  `;

  const textBody = `Task due: ${taskTitle}\n\nDue date: ${dueDate}\n\nView your tasks at ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'}/tasks`;

  return { subject, htmlBody: layout(subject, bodyHtml), textBody };
}

/**
 * Notification sent when a deal moves to a new pipeline stage.
 */
export function dealStageChange(dealName: string, newStage: string): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const safeDeal = escapeHtml(dealName);
  const safeStage = escapeHtml(newStage);
  const subject = `Deal update: "${dealName}"`;

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      Deal stage updated
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      A deal in your pipeline has moved to a new stage.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#f9fafb;">
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#374151;width:100px;">Deal</td>
        <td style="padding:10px 16px;font-size:14px;color:#111827;">${safeDeal}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#374151;border-top:1px solid #e5e7eb;">New Stage</td>
        <td style="padding:10px 16px;font-size:14px;color:#059669;font-weight:600;border-top:1px solid #e5e7eb;">${safeStage}</td>
      </tr>
    </table>
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'}/pipeline"
       style="display:inline-block;background:#1A1A2E;color:#ffffff;text-decoration:none;
              padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">
      View Pipeline
    </a>
  `;

  const textBody = `Deal update: "${dealName}" moved to "${newStage}"\n\nView your pipeline at ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'}/pipeline`;

  return { subject, htmlBody: layout(subject, bodyHtml), textBody };
}
