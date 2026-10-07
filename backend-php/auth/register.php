<?php
// backend/auth/register.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/email_templates.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_err('Method not allowed', 405);

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) $data = $_POST;

$companyName = trim($data['company_name'] ?? '');
$fullName    = trim($data['full_name'] ?? '');
$email       = strtolower(trim($data['email'] ?? ''));
$password    = $data['password'] ?? '';
$phone       = trim($data['phone'] ?? '');

// Validation
if (!$companyName) json_err('Company name is required');
if (!$fullName)    json_err('Full name is required');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_err('Invalid email address');
if (strlen($password) < 8) json_err('Password must be at least 8 characters');

// Check duplicate email
$stmt = db()->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) json_err('An account with this email already exists', 409);

$pdo = db();
$pdo->beginTransaction();

try {
    // Create tenant
    $tenantId = uuid();
    $stmt = $pdo->prepare("
        INSERT INTO tenants (id, company_name, billing_email) VALUES (?, ?, ?)
    ");
    $stmt->execute([$tenantId, $companyName, $email]);

    // Create user
    $userId = uuid();
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $verificationCode = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $verificationExpiry = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $stmt = $pdo->prepare("
        INSERT INTO users 
        (id, tenant_id, full_name, email, password_hash, phone,
         role, email_verified, verification_code, verification_expiry)
        VALUES (?, ?, ?, ?, ?, ?, 'MINE_OWNER', 0, ?, ?)
    ");
    $stmt->execute([
        $userId, $tenantId, $fullName, $email, 
        $passwordHash, $phone, $verificationCode, $verificationExpiry
    ]);

    // Seed default mine deadlines templates will be generated on first mine add

    $pdo->commit();

    // Send verification email
    $emailBody = email_verification_template($fullName, $verificationCode);
    send_email($email, $fullName, 'Verify your ComplianceOS account', $emailBody);

    // Audit
    audit('CREATE', 'tenant', $tenantId, $tenantId, $userId);

    $isDev = (empty(SMTP_USER) || SMTP_USER === 'your_email@gmail.com');
    $payload = [
        'user_id'   => $userId,
        'tenant_id' => $tenantId,
        'email'     => $email,
        'message'   => 'Account created. Check your email for the verification code.',
        'requires_verification' => true,
    ];
    if ($isDev) {
        $payload['debug_code'] = $verificationCode;
        $payload['debug_note'] = 'SMTP is not yet configured in .env. Use this code or check email_debug.log';
    }

    json_ok($payload, 201);

} catch (Exception $e) {
    $pdo->rollBack();
    json_err('Registration failed: ' . $e->getMessage(), 500);
}
