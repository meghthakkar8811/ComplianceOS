<?php
// backend/auth/resend_code.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/email_templates.php';
header('Content-Type: application/json');

$data  = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$email = strtolower(trim($data['email'] ?? ''));
if (!$email) json_err('Email is required');

$stmt = db()->prepare("SELECT id, full_name, email_verified FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) json_err('Account not found', 404);
if ($user['email_verified']) json_ok(['message' => 'Already verified']);

$code    = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$expiry  = date('Y-m-d H:i:s', strtotime('+15 minutes'));
db()->prepare("UPDATE users SET verification_code=?, verification_expiry=? WHERE id=?")
    ->execute([$code, $expiry, $user['id']]);

send_email($email, $user['full_name'],
    'Your new ComplianceOS verification code',
    email_verification_template($user['full_name'], $code));

$isDev = (empty(SMTP_USER) || SMTP_USER === 'your_email@gmail.com');
$resp = ['message' => 'New verification code sent to your email.'];
if ($isDev) {
    $resp['debug_code'] = $code;
    $resp['debug_note'] = 'SMTP is not yet configured in .env. Use this code or check email_debug.log';
}

json_ok($resp);
