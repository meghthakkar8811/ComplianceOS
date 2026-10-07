<?php
// backend/auth/logout.php
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json');

session_start_secure();

// Delete DB session
if (isset($_COOKIE['cos_session'])) {
    $tokenHash = hash_token($_COOKIE['cos_session']);
    db()->prepare("DELETE FROM sessions WHERE token_hash = ?")
        ->execute([$tokenHash]);
    setcookie('cos_session', '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true]);
}

// Also delete by user_id if session exists
if (isset($_SESSION['user_id'])) {
    audit('LOGOUT', 'user', $_SESSION['user_id'], $_SESSION['tenant_id'] ?? null, $_SESSION['user_id']);
    db()->prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at > NOW()")
        ->execute([$_SESSION['user_id']]);
}

session_destroy();
json_ok(['message' => 'Logged out successfully']);
