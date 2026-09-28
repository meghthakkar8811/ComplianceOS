<?php
// backend/auth/google_callback.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/email_templates.php';

// Exchange code for token
$code = $_GET['code'] ?? '';
if (!$code) {
    header('Location: ' . APP_URL . '/frontend/login.html?error=google_failed');
    exit;
}

// Get access token from Google
$tokenRes = file_get_contents('https://oauth2.googleapis.com/token', false, stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query([
            'code'          => $code,
            'client_id'     => GOOGLE_CLIENT_ID,
            'client_secret' => GOOGLE_CLIENT_SECRET,
            'redirect_uri'  => GOOGLE_REDIRECT_URI,
            'grant_type'    => 'authorization_code',
        ]),
    ],
]));

$tokenData = json_decode($tokenRes, true);
if (empty($tokenData['access_token'])) {
    header('Location: ' . APP_URL . '/frontend/login.html?error=google_token_failed');
    exit;
}

// Get user info from Google
$userRes  = file_get_contents('https://www.googleapis.com/oauth2/v2/userinfo', false,
    stream_context_create(['http' => ['header' => 'Authorization: Bearer ' . $tokenData['access_token']]]));
$googleUser = json_decode($userRes, true);

if (empty($googleUser['email'])) {
    header('Location: ' . APP_URL . '/frontend/login.html?error=google_userinfo_failed');
    exit;
}

$email    = strtolower($googleUser['email']);
$name     = $googleUser['name'] ?? $email;
$googleId = $googleUser['id'] ?? '';
$avatar   = $googleUser['picture'] ?? '';

// Find or create user
$stmt = db()->prepare("
    SELECT u.*, t.company_name, t.plan 
    FROM users u JOIN tenants t ON t.id = u.tenant_id 
    WHERE u.email = ? AND u.is_active = 1
");
$stmt->execute([$email]);
$user = $stmt->fetch();

$pdo = db();

if (!$user) {
    // New user — create tenant + user
    $pdo->beginTransaction();
    try {
        $tenantId = uuid();
        $pdo->prepare("INSERT INTO tenants (id, company_name, billing_email) VALUES (?,?,?)")
            ->execute([$tenantId, $name . "'s Mining Co", $email]);

        $userId = uuid();
        $pdo->prepare("
            INSERT INTO users 
            (id, tenant_id, full_name, email, google_id, avatar_url,
             auth_provider, email_verified, role)
            VALUES (?,?,?,?,?,?,'GOOGLE',1,'MINE_OWNER')
        ")->execute([$userId, $tenantId, $name, $email, $googleId, $avatar]);

        $pdo->commit();

        // Welcome email
        send_email($email, $name, 'Welcome to ComplianceOS!',
            email_welcome_template($name, $name . "'s Mining Co"));

        $user = [
            'id' => $userId, 'tenant_id' => $tenantId,
            'full_name' => $name, 'email' => $email,
            'role' => 'MINE_OWNER', 'company_name' => $name . "'s Mining Co",
            'plan' => 'STARTER', 'avatar_url' => $avatar,
        ];
    } catch (Exception $e) {
        $pdo->rollBack();
        header('Location: ' . APP_URL . '/frontend/login.html?error=google_create_failed');
        exit;
    }
} else {
    // Update Google ID and avatar if needed
    db()->prepare("UPDATE users SET google_id=?, avatar_url=?, email_verified=1 WHERE id=?")
        ->execute([$googleId, $avatar, $user['id']]);
}

// Create session
$token     = generate_token();
$tokenHash = hash_token($token);
$expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);

db()->prepare("
    INSERT INTO sessions (id, user_id, tenant_id, token_hash, ip_address, expires_at)
    VALUES (?,?,?,?,?,?)
")->execute([
    uuid(), $user['id'], $user['tenant_id'],
    $tokenHash, $_SERVER['REMOTE_ADDR'] ?? '', $expiresAt
]);

db()->prepare("UPDATE users SET last_login=NOW() WHERE id=?")->execute([$user['id']]);

session_start_secure();
$_SESSION['user_id']   = $user['id'];
$_SESSION['tenant_id'] = $user['tenant_id'];
$_SESSION['role']      = $user['role'];

setcookie('cos_session', $token, [
    'expires' => time() + SESSION_LIFETIME,
    'path' => '/', 'httponly' => true,
    'samesite' => 'Strict', 'secure' => isset($_SERVER['HTTPS']),
]);

// Pass user data to frontend via URL params (token only — rest via API)
header('Location: ' . APP_URL . '/frontend/dashboard.html?token=' . urlencode($token)
    . '&name=' . urlencode($user['full_name']));
exit;
