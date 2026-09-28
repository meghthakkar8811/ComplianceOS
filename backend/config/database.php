<?php
// ============================================================
// config/database.php — Database connection + helpers
// ============================================================

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/../../vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'complianceos');

define('APP_NAME',    'ComplianceOS');
define('APP_URL',     getenv('APP_URL') ?: 'http://localhost:8000');
define('APP_SECRET',  getenv('APP_SECRET') ?: 'cos_secret_key_change_in_production_2026');
define('SESSION_LIFETIME', 60 * 60 * 24 * 30); // 30 days

// Google OAuth
define('GOOGLE_CLIENT_ID',     getenv('GOOGLE_CLIENT_ID') ?: '');
define('GOOGLE_CLIENT_SECRET', getenv('GOOGLE_CLIENT_SECRET') ?: '');
define('GOOGLE_REDIRECT_URI',  APP_URL . '/backend/auth/google_callback.php');

// Email (SMTP — configure with your SMTP provider)
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_PORT', getenv('SMTP_PORT') ?: '587');
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('SMTP_FROM', getenv('SMTP_FROM') ?: 'noreply@complianceos.in');
define('SMTP_NAME', 'ComplianceOS');

// ── Database connection (singleton) ─────────────────────────
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $portClause = DB_PORT ? ";port=" . DB_PORT : "";
            $dsn = "mysql:host=" . DB_HOST . $portClause . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            die(json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }
    return $pdo;
}

// ── Session helpers ──────────────────────────────────────────
function session_start_secure(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path'     => '/',
            'secure'   => isset($_SERVER['HTTPS']),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }
}

// ── UUID generator ───────────────────────────────────────────
function uuid(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// ── Auth token ───────────────────────────────────────────────
function generate_token(): string {
    return bin2hex(random_bytes(32));
}

function hash_token(string $token): string {
    return hash('sha256', $token . APP_SECRET);
}

// ── Current user (from session or cookie) ───────────────────
function current_user(): ?array {
    session_start_secure();
    if (!isset($_SESSION['user_id'])) {
        // Check remember-me cookie
        if (isset($_COOKIE['cos_session'])) {
            $tokenHash = hash_token($_COOKIE['cos_session']);
            $stmt = db()->prepare("
                SELECT u.*, t.company_name, t.plan
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                JOIN tenants t ON t.id = u.tenant_id
                WHERE s.token_hash = ? AND s.expires_at > NOW()
            ");
            $stmt->execute([$tokenHash]);
            $user = $stmt->fetch();
            if ($user) {
                $_SESSION['user_id']   = $user['id'];
                $_SESSION['tenant_id'] = $user['tenant_id'];
                $_SESSION['role']      = $user['role'];
                return $user;
            }
        }
        return null;
    }
    $stmt = db()->prepare("
        SELECT u.*, t.company_name, t.plan
        FROM users u
        JOIN tenants t ON t.id = u.tenant_id
        WHERE u.id = ? AND u.is_active = 1
    ");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch() ?: null;
}

function require_auth(): array {
    $user = current_user();
    if (!$user) {
        header('Location: ' . APP_URL . '/frontend/login.html');
        exit;
    }
    if (!$user['email_verified']) {
        header('Location: ' . APP_URL . '/frontend/verify.html');
        exit;
    }
    return $user;
}

// ── JSON response helpers ────────────────────────────────────
function json_ok(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function json_err(string $message, int $code = 400): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'Asia/Kolkata');

// ── Email sender (using PHPMailer for robust SMTP support) ──
function send_email(string $to, string $toName, string $subject, string $htmlBody): bool {
    // For local testing: log the email content so we can see verification codes
    @file_put_contents(__DIR__ . '/../../email_debug.log', 
        "[" . date('Y-m-d H:i:s') . "]\nTo: $to ($toName)\nSubject: $subject\n\n$htmlBody\n" . str_repeat("-", 40) . "\n", 
        FILE_APPEND
    );

    // If SMTP credentials are still placeholders or empty, do not attempt network connection
    if (empty(SMTP_HOST) || SMTP_HOST === 'localhost' || empty(SMTP_USER) || SMTP_USER === 'your_email@gmail.com' || empty(SMTP_PASS) || SMTP_PASS === 'your_gmail_app_password') {
        error_log("SMTP credentials not configured in .env. Logged email to email_debug.log.");
        return false;
    }

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = (int)SMTP_PORT === 465 ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;

        $mail->setFrom(SMTP_FROM, SMTP_NAME);
        $mail->addAddress($to, $toName);
        $mail->addReplyTo(SMTP_FROM, SMTP_NAME);
        
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
        return false;
    }
}

// ── CSRF token ───────────────────────────────────────────────
function csrf_token(): string {
    session_start_secure();
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(string $token): bool {
    session_start_secure();
    return hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

// ── Audit log ────────────────────────────────────────────────
function audit(string $action, string $entityType, ?string $entityId = null,
               ?string $tenantId = null, ?string $userId = null): void {
    session_start_secure();
    $tid = $tenantId ?? ($_SESSION['tenant_id'] ?? null);
    $uid = $userId   ?? ($_SESSION['user_id']   ?? null);
    $ip  = $_SERVER['REMOTE_ADDR'] ?? null;
    $stmt = db()->prepare("
        INSERT INTO audit_log (id, tenant_id, user_id, entity_type, entity_id, action, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([uuid(), $tid, $uid, $entityType, $entityId, $action, $ip]);
}
