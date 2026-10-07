<?php
// backend/auth/reset_password.php
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json');

$data     = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$email    = strtolower(trim($data['email'] ?? ''));
$code     = trim($data['code'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$code || !$password) json_err('Email, code and new password are required');
if (strlen($password) < 8) json_err('Password must be at least 8 characters');

$stmt = db()->prepare("SELECT id, reset_token, reset_expiry FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !$user['reset_token']) json_err('Invalid reset request', 400);
if (strtotime($user['reset_expiry']) < time()) json_err('Reset code expired', 410);
if (!hash_equals($user['reset_token'], $code)) json_err('Invalid reset code', 401);

$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
db()->prepare("UPDATE users SET password_hash=?, reset_token=NULL, reset_expiry=NULL WHERE id=?")
    ->execute([$hash, $user['id']]);

// Invalidate all sessions
db()->prepare("DELETE FROM sessions WHERE user_id=?")->execute([$user['id']]);

json_ok(['message' => 'Password reset successfully. You can now log in.']);
