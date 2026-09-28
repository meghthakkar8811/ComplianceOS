<?php
// backend/auth/forgot_password.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/email_templates.php';
header('Content-Type: application/json');

$data  = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$email = strtolower(trim($data['email'] ?? ''));
if (!$email) json_err('Email is required');

$stmt = db()->prepare("SELECT id, full_name FROM users WHERE email = ? AND is_active = 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

// Always return success to prevent email enumeration
if (!$user) {
    json_ok(['message' => 'If that email exists, a reset code has been sent.']);
}

$code   = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$expiry = date('Y-m-d H:i:s', strtotime('+15 minutes'));

db()->prepare("UPDATE users SET reset_token=?, reset_expiry=? WHERE id=?")
    ->execute([$code, $expiry, $user['id']]);

send_email($email, $user['full_name'],
    'Reset your ComplianceOS password',
    email_password_reset_template($user['full_name'], $code));

json_ok(['message' => 'If that email exists, a reset code has been sent.']);
