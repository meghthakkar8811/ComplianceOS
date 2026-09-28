<?php
// backend/auth/login.php
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_err('Method not allowed', 405);

$data  = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$email    = strtolower(trim($data['email'] ?? ''));
$password = $data['password'] ?? '';
$remember = !empty($data['remember']);

if (!$email || !$password) json_err('Email and password are required');

// Rate limiting via simple DB check (5 attempts per 15 min)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$window = date('Y-m-d H:i:s', strtotime('-15 minutes'));
$stmt = db()->prepare("
    SELECT COUNT(*) FROM audit_log 
    WHERE ip_address = ? AND action = 'LOGIN' AND entity_type = 'login_fail' AND created_at > ?
");
$stmt->execute([$ip, $window]);
if ((int)$stmt->fetchColumn() >= 5) {
    json_err('Too many login attempts. Please wait 15 minutes.', 429);
}

// Fetch user
$stmt = db()->prepare("
    SELECT u.*, t.company_name, t.plan
    FROM users u JOIN tenants t ON t.id = u.tenant_id
    WHERE u.email = ? AND u.is_active = 1
");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'] ?? '')) {
    // Record failed attempt
    try {
        db()->prepare("
            INSERT INTO audit_log (id, entity_type, action, ip_address) VALUES (?,?,?,?)
        ")->execute([uuid(), 'login_fail', 'LOGIN', $ip]);
    } catch (Throwable $e) {
        error_log('Audit log failed: ' . $e->getMessage());
    }
    json_err('Invalid email or password', 401);
}

if (!$user['email_verified']) {
    json_err('Please verify your email address before logging in.', 403);
}

// Create session token
$token     = generate_token();
$tokenHash = hash_token($token);
$expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);
$sessionId = uuid();

db()->prepare("
    INSERT INTO sessions (id, user_id, tenant_id, token_hash, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
")->execute([
    $sessionId, $user['id'], $user['tenant_id'],
    $tokenHash, $ip,
    substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
    $expiresAt
]);

// Update last login
db()->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")
    ->execute([$user['id']]);

// Set session
session_start_secure();
$_SESSION['user_id']   = $user['id'];
$_SESSION['tenant_id'] = $user['tenant_id'];
$_SESSION['role']      = $user['role'];

// Remember-me cookie
if ($remember) {
    setcookie('cos_session', $token, [
        'expires'  => time() + SESSION_LIFETIME,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Strict',
        'secure'   => isset($_SERVER['HTTPS']),
    ]);
}

audit('LOGIN', 'user', $user['id'], $user['tenant_id'], $user['id']);

json_ok([
    'token'        => $token,
    'user_id'      => $user['id'],
    'tenant_id'    => $user['tenant_id'],
    'full_name'    => $user['full_name'],
    'email'        => $user['email'],
    'role'         => $user['role'],
    'company_name' => $user['company_name'],
    'plan'         => $user['plan'],
    'avatar_url'   => $user['avatar_url'],
]);
