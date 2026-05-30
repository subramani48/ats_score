const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'dummy@ethereal.email',
        pass: process.env.SMTP_PASS || 'dummyPassword'
    }
});

const sendReport = async (name, email, analysis) => {
    try {
        const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8f7ff;">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;">ATS Analyzer</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Resume Analysis Report</p>
  </div>
  <div style="background:#fff;padding:36px 32px;">
    <h2 style="margin:0 0 12px;color:#0f0e1a;font-size:18px;">Hi ${name},</h2>
    <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">Your ATS analysis is complete. Here's how your resume scored:</p>

    <div style="text-align:center;padding:28px;background:linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.06));border:1px solid rgba(99,102,241,0.15);border-radius:16px;margin-bottom:28px;">
      <div style="font-size:56px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${analysis.score}%</div>
      <div style="color:#6b7280;font-size:14px;margin-top:4px;">ATS Compatibility Score</div>
    </div>

    <h3 style="margin:0 0 12px;color:#0f0e1a;font-size:15px;font-weight:700;">Suggestions to Improve</h3>
    <ul style="margin:0 0 24px;padding-left:20px;color:#374151;line-height:1.9;font-size:14px;">
      ${analysis.suggestions.map(s => `<li>${s}</li>`).join('')}
    </ul>
    <p style="color:#9ca3af;font-size:13px;margin:0;">For best results, tailor your resume to each specific job description.</p>
  </div>
  <div style="background:#f0effe;padding:20px 32px;text-align:center;border-top:1px solid #e5e3fc;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} ATS Analyzer &mdash; Completely free. No data stored.</p>
  </div>
</div>`;

        const info = await transporter.sendMail({
            from: '"ATS Analyzer" <noreply@ats-analyzer.com>',
            to: email,
            subject: `Your ATS Resume Score: ${analysis.score}%`,
            html,
        });

        console.log('Analysis email sent:', info.messageId);
        if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        return true;
    } catch (error) {
        console.error('Error sending analysis email:', error);
        return false;
    }
};

const sendRewrittenEmail = async (name, email, rewrittenContent) => {
    try {
        const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:700px;margin:0 auto;background:#f8f7ff;">
  <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:36px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;">ATS Analyzer</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">AI-Optimised Resume &mdash; Ready to Apply</p>
  </div>
  <div style="background:#fff;padding:36px 32px;">
    <h2 style="margin:0 0 12px;color:#0f0e1a;font-size:18px;">Hi ${name},</h2>
    <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">
      Your resume has been rewritten by Gemini AI to perfectly match the job description you provided.
      It has been tailored for ATS systems and highlights your most relevant qualifications.
    </p>

    <div style="background:#f8f7ff;border:1px solid rgba(99,102,241,0.18);border-radius:12px;padding:24px;margin-bottom:28px;">
      <h3 style="margin:0 0 16px;color:#6366f1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;">Your Optimised Resume</h3>
      <pre style="margin:0;white-space:pre-wrap;font-family:'Courier New',monospace;font-size:13px;color:#374151;line-height:1.75;">${rewrittenContent}</pre>
    </div>

    <h3 style="margin:0 0 10px;color:#0f0e1a;font-size:14px;font-weight:700;">Next Steps</h3>
    <ul style="margin:0;padding-left:20px;color:#6b7280;font-size:13px;line-height:1.9;">
      <li>Review and personalise any sections if needed.</li>
      <li>Save as a PDF before submitting your application.</li>
      <li>Re-run the Analyzer to confirm your new ATS score.</li>
    </ul>
  </div>
  <div style="background:#f0effe;padding:20px 32px;text-align:center;border-top:1px solid #e5e3fc;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} ATS Analyzer &mdash; Completely free. No data stored.</p>
  </div>
</div>`;

        const info = await transporter.sendMail({
            from: '"ATS Analyzer" <noreply@ats-analyzer.com>',
            to: email,
            subject: 'Your AI-Rewritten, ATS-Optimised Resume',
            html,
        });

        console.log('Rewrite email sent:', info.messageId);
        if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        return true;
    } catch (error) {
        console.error('Error sending rewrite email:', error);
        return false;
    }
};

module.exports = { sendReport, sendRewrittenEmail };
