const { app } = require('@azure/functions');
const sgMail  = require('@sendgrid/mail');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TO_EMAIL = 'wahid.alimi@gmail.com';
const CC_EMAIL = 'manisha.alimi@gmail.com';

app.http('rsvp', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'rsvp',
  handler: async (req, context) => {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: CORS };
    }

    try {
      const body = await req.json();
      const { name, email, guests, message } = body || {};

      if (!name || !guests || guests < 1) {
        return {
          status: 400,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'name and guests are required' }),
        };
      }

      const apiKey   = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.SENDGRID_FROM_EMAIL;

      if (!apiKey || !fromEmail) {
        context.warn('SendGrid not configured — RSVP received but not emailed:', { name, guests });
        return {
          status: 200,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true }),
        };
      }

      sgMail.setApiKey(apiKey);

      const guestLabel = parseInt(guests) === 1 ? '1 person' : `${guests} people`;

      const textBody = [
        '🎓 New RSVP — Rayan\'s Graduation Celebration',
        '─'.repeat(44),
        `Name:       ${name}`,
        email   ? `Email:      ${email}` : null,
        `Attendees:  ${guestLabel}`,
        message ? `\nMessage:\n${message}` : null,
        '',
        '─'.repeat(44),
        'Sent via Rayan\'s Graduation Website',
      ].filter(Boolean).join('\n');

      const htmlBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:12px;overflow:hidden;border:2px solid #FFCC00;">
          <div style="background:#006633;padding:2rem;text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:0.5rem;">🎓</div>
            <h1 style="color:#FFCC00;margin:0;font-size:1.7rem;font-weight:900;">New RSVP!</h1>
            <p style="color:rgba(255,255,255,0.85);margin:0.4rem 0 0;font-size:0.95rem;">Rayan's Graduation Celebration</p>
          </div>
          <div style="padding:2rem;background:#fff;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:0.7rem 0.5rem;border-bottom:1px solid #eee;color:#888;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;width:120px;">Name</td>
                <td style="padding:0.7rem 0.5rem;border-bottom:1px solid #eee;font-weight:600;color:#111;">${esc(name)}</td>
              </tr>
              ${email ? `
              <tr>
                <td style="padding:0.7rem 0.5rem;border-bottom:1px solid #eee;color:#888;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Email</td>
                <td style="padding:0.7rem 0.5rem;border-bottom:1px solid #eee;color:#111;">${esc(email)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:0.7rem 0.5rem;border-bottom:1px solid #eee;color:#888;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Attendees</td>
                <td style="padding:0.7rem 0.5rem;border-bottom:1px solid #eee;font-weight:700;color:#006633;font-size:1.1rem;">${esc(String(guests))} ${parseInt(guests) === 1 ? 'person' : 'people'}</td>
              </tr>
              ${message ? `
              <tr>
                <td style="padding:0.7rem 0.5rem;color:#888;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;vertical-align:top;">Message</td>
                <td style="padding:0.7rem 0.5rem;color:#111;line-height:1.6;">${esc(message).replace(/\n/g, '<br>')}</td>
              </tr>` : ''}
            </table>
          </div>
          <div style="background:#f5f5f5;padding:1rem 2rem;text-align:center;color:#999;font-size:0.8rem;">
            Rayan's Graduation Website &nbsp;•&nbsp; Go Patriots! 🟢🟡
          </div>
        </div>
      `;

      await sgMail.send({
        to:      TO_EMAIL,
        cc:      CC_EMAIL,
        from:    fromEmail,
        subject: `🎓 RSVP from ${name} — Rayan's Graduation Celebration (${guestLabel})`,
        text:    textBody,
        html:    htmlBody,
      });

      context.log(`RSVP email sent for ${name} (${guestLabel})`);

      return {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      context.error('rsvp error:', err);
      return {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to send RSVP — please try again' }),
      };
    }
  },
});

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
