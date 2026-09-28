<?php
// ============================================================
// includes/email_templates.php — All email HTML templates
// ============================================================

function email_verification_template(string $name, string $code): string {
    return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0b1120;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b1120;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#111e36;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#0e1628,#172444);padding:32px;text-align:center;border-bottom:1px solid rgba(232,160,32,0.3)">
          <div style="font-size:28px;color:#e8a020;margin-bottom:6px">⬡</div>
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#edf2fb;letter-spacing:-0.5px">ComplianceOS</div>
          <div style="font-size:11px;color:#4e6a8a;letter-spacing:2px;text-transform:uppercase;margin-top:3px">Mining Compliance Platform</div>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:36px 40px">
          <p style="color:#8fa8cc;font-size:14px;margin:0 0 8px">Hello, {$name}</p>
          <h2 style="color:#edf2fb;font-size:20px;margin:0 0 16px;font-family:Georgia,serif">Verify your email address</h2>
          <p style="color:#8fa8cc;font-size:14px;line-height:1.7;margin:0 0 28px">
            Welcome to ComplianceOS. Use the verification code below to activate your account.
            This code expires in <strong style="color:#e8a020">15 minutes</strong>.
          </p>
          <!-- OTP Box -->
          <div style="background:#0b1120;border:2px solid #e8a020;border-radius:10px;padding:24px;text-align:center;margin:0 0 28px">
            <div style="font-size:11px;color:#4e6a8a;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px">Your Verification Code</div>
            <div style="font-family:'Courier New',monospace;font-size:42px;font-weight:bold;color:#e8a020;letter-spacing:12px">{$code}</div>
          </div>
          <p style="color:#4e6a8a;font-size:12px;line-height:1.6;margin:0">
            If you did not create a ComplianceOS account, you can safely ignore this email.<br>
            Never share this code with anyone.
          </p>
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:#0b1120;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
          <p style="color:#2e4060;font-size:11px;margin:0">
            © 2026 ComplianceOS · Mining Statutory Compliance Platform · India
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
}

function email_welcome_template(string $name, string $company): string {
    return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0b1120;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b1120;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#111e36;border-radius:12px;border:1px solid rgba(255,255,255,0.08)">
      <tr>
        <td style="background:linear-gradient(135deg,#0e1628,#172444);padding:32px;text-align:center;border-bottom:1px solid rgba(232,160,32,0.3)">
          <div style="font-size:28px;color:#e8a020">⬡</div>
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#edf2fb">ComplianceOS</div>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px">
          <h2 style="color:#edf2fb;font-size:20px;margin:0 0 16px;font-family:Georgia,serif">Welcome, {$name}! 🎉</h2>
          <p style="color:#8fa8cc;font-size:14px;line-height:1.7;margin:0 0 16px">
            Your ComplianceOS account for <strong style="color:#e8a020">{$company}</strong> is now active.
          </p>
          <p style="color:#8fa8cc;font-size:14px;line-height:1.7;margin:0 0 24px">Here is what you can do right now:</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#0b1120;border-radius:8px;padding:14px 18px;border-left:3px solid #e8a020;margin-bottom:10px;display:block">
                <div style="color:#e8a020;font-size:12px;font-weight:bold;margin-bottom:4px">STEP 1</div>
                <div style="color:#edf2fb;font-size:13px">Add your first mine lease</div>
              </td>
            </tr>
          </table>
          <br>
          <a href="{APP_URL}/frontend/dashboard.html" style="display:inline-block;background:#e8a020;color:#0b1120;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">Open Dashboard →</a>
        </td>
      </tr>
      <tr>
        <td style="background:#0b1120;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
          <p style="color:#2e4060;font-size:11px;margin:0">© 2026 ComplianceOS · India</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
}

function email_password_reset_template(string $name, string $code): string {
    return <<<HTML
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0b1120;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b1120;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#111e36;border-radius:12px;border:1px solid rgba(255,255,255,0.08)">
      <tr><td style="background:linear-gradient(135deg,#0e1628,#172444);padding:32px;text-align:center;border-bottom:1px solid rgba(232,160,32,0.3)">
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#edf2fb">ComplianceOS</div>
      </td></tr>
      <tr><td style="padding:36px 40px">
        <h2 style="color:#edf2fb;font-size:20px;margin:0 0 16px">Password Reset Code</h2>
        <p style="color:#8fa8cc;font-size:14px;line-height:1.7;margin:0 0 24px">Hello {$name}, use this code to reset your password. Valid for 15 minutes.</p>
        <div style="background:#0b1120;border:2px solid #e74c3c;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px">
          <div style="font-size:11px;color:#4e6a8a;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px">Reset Code</div>
          <div style="font-family:'Courier New',monospace;font-size:38px;font-weight:bold;color:#e74c3c;letter-spacing:10px">{$code}</div>
        </div>
        <p style="color:#4e6a8a;font-size:12px">If you did not request a password reset, ignore this email and your password will remain unchanged.</p>
      </td></tr>
      <tr><td style="background:#0b1120;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
        <p style="color:#2e4060;font-size:11px;margin:0">© 2026 ComplianceOS · India</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>
HTML;
}
