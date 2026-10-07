<?php
// backend/auth/verify_email.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/email_templates.php';

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_err('Method not allowed', 405);

$data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$email = strtolower(trim($data['email'] ?? ''));
$code  = trim($data['code'] ?? '');

if (!$email || !$code) json_err('Email and code are required');

$stmt = db()->prepare("
    SELECT id, tenant_id, full_name, verification_code, verification_expiry, email_verified
    FROM users WHERE email = ?
");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) json_err('Account not found', 404);
if ($user['email_verified']) json_ok(['message' => 'Already verified', 'already_verified' => true]);
if (strtotime($user['verification_expiry']) < time()) json_err('Verification code expired. Please request a new one.', 410);
if (!hash_equals($user['verification_code'], $code)) json_err('Invalid verification code', 401);

// Mark verified
db()->prepare("UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?")
    ->execute([$user['id']]);

// Send welcome email
$welcomeBody = email_welcome_template($user['full_name'], '');
send_email($email, $user['full_name'], 'Welcome to ComplianceOS!', $welcomeBody);

audit('CREATE', 'email_verification', $user['id'], $user['tenant_id'], $user['id']);

json_ok(['message' => 'Email verified successfully. You can now log in.', 'verified' => true]);
