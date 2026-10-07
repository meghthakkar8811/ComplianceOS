<?php
// backend/api/mines.php
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Authenticate
$token = null;
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (preg_match('/Bearer (.+)/', $authHeader, $m)) $token = $m[1];
if (!$token && isset($_COOKIE['cos_session'])) $token = $_COOKIE['cos_session'];

if (!$token) json_err('Unauthorized', 401);

$tokenHash = hash_token($token);
$stmt = db()->prepare("
    SELECT u.*, t.company_name, t.plan
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN tenants t ON t.id = u.tenant_id
    WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1
");
$stmt->execute([$tokenHash]);
$user = $stmt->fetch();
if (!$user) json_err('Unauthorized', 401);

$tenantId = $user['tenant_id'];
$userId   = $user['id'];
$method   = $_SERVER['REQUEST_METHOD'];
$action   = $_GET['action'] ?? '';
$mineId   = $_GET['mine_id'] ?? '';

// ── GET /mines ───────────────────────────────────────────────
if ($method === 'GET' && !$action) {
    $stmt = db()->prepare("SELECT * FROM mines WHERE tenant_id = ? AND is_active = 1 ORDER BY created_at DESC");
    $stmt->execute([$tenantId]);
    json_ok($stmt->fetchAll());
}

// ── POST /mines (create) ─────────────────────────────────────
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $name     = trim($data['name'] ?? '');
    $lease    = trim($data['lease_number'] ?? '');
    $state    = strtoupper(str_replace(' ', '_', trim($data['state'] ?? '')));
    $mineral  = strtoupper(str_replace(' ', '_', trim($data['mineral'] ?? '')));
    $district = trim($data['district'] ?? '');
    $mineType = $data['mine_type'] ?? 'METALLIFEROUS';

    if (!$name || !$lease || !$state || !$mineral) json_err('Name, lease number, state and mineral are required');

    $id = uuid();
    db()->prepare("
        INSERT INTO mines (id, tenant_id, name, lease_number, state, district, mineral, mine_type)
        VALUES (?,?,?,?,?,?,?,?)
    ")->execute([$id, $tenantId, $name, $lease, $state, $district, $mineral, $mineType]);

    // Auto-generate compliance deadlines for next 12 months
    generateComplianceCalendar($id, $tenantId, $state, $mineral, $mineType);

    // Seed DGMS registers
    seedDgmsRegisters($id, $tenantId);

    $stmt = db()->prepare("SELECT * FROM mines WHERE id = ?");
    $stmt->execute([$id]);
    audit('CREATE', 'mine', $id);
    json_ok($stmt->fetch(), 201);
}

// ── PATCH /mines?mine_id=x ───────────────────────────────────
if ($method === 'PATCH' && $mineId) {
    $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $stmt = db()->prepare("SELECT id FROM mines WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$mineId, $tenantId]);
    if (!$stmt->fetch()) json_err('Mine not found', 404);

    $allowed = ['name','district','lease_area_hectares','lease_start_date','lease_end_date'];
    $sets = []; $vals = [];
    foreach ($allowed as $f) {
        if (isset($data[$f])) { $sets[] = "$f = ?"; $vals[] = $data[$f]; }
    }
    if ($sets) {
        $vals[] = $mineId;
        db()->prepare("UPDATE mines SET " . implode(', ', $sets) . " WHERE id = ?")->execute($vals);
    }
    $stmt = db()->prepare("SELECT * FROM mines WHERE id = ?");
    $stmt->execute([$mineId]);
    json_ok($stmt->fetch());
}

// ── DELETE /mines?mine_id=x ──────────────────────────────────
if ($method === 'DELETE' && $mineId) {
    db()->prepare("UPDATE mines SET is_active = 0 WHERE id = ? AND tenant_id = ?")
        ->execute([$mineId, $tenantId]);
    json_ok(['message' => 'Mine deactivated']);
}

// ── HELPERS ──────────────────────────────────────────────────

function generateComplianceCalendar(string $mineId, string $tenantId, string $state, string $mineral, string $mineType): void {
    $today = new DateTime();
    $templates = [
        ['IBM Form B — Monthly Production Return',      'IBM',      'MONTHLY',     5],
        ['Royalty e-Challan Payment',                   'STATE_DME','MONTHLY',    10],
        ['DGMS Quarterly Safety Report',                'DGMS',     'QUARTERLY',  15],
        ['SPCB Half-Yearly Compliance Report',          'SPCB',     'HALF_YEARLY',31],
        ['IBM Form C — Quarterly Labour Return',        'IBM',      'QUARTERLY',  30],
        ['IBM Form J — Annual Return',                  'IBM',      'ANNUAL',     31],
        ['Annual Tree Plantation Progress Report',      'FOREST',   'ANNUAL',     20],
    ];

    $stmt = db()->prepare("
        INSERT INTO compliance_deadlines (id, tenant_id, mine_id, title, authority, due_date)
        VALUES (?,?,?,?,?,?)
    ");

    foreach ($templates as [$title, $authority, $recurrence, $day]) {
        $dates = getDueDates($today, $recurrence, $day, 12);
        foreach ($dates as $date) {
            $stmt->execute([uuid(), $tenantId, $mineId, $title, $authority, $date]);
        }
    }
}

function getDueDates(DateTime $from, string $recurrence, int $day, int $months): array {
    $dates = [];
    $count = match($recurrence) {
        'MONTHLY'     => $months,
        'QUARTERLY'   => 4,
        'HALF_YEARLY' => 2,
        'ANNUAL'      => 1,
        default       => 1,
    };
    $step = match($recurrence) {
        'MONTHLY'     => 1,
        'QUARTERLY'   => 3,
        'HALF_YEARLY' => 6,
        'ANNUAL'      => 12,
        default       => 12,
    };
    $cur = clone $from;
    for ($i = 0; $i < $count; $i++) {
        $maxDay = (int)(new DateTime($cur->format('Y-m-01')))->format('t');
        $d = clone $cur;
        $d->setDate((int)$d->format('Y'), (int)$d->format('m'), min($day, $maxDay));
        if ($d >= $from) $dates[] = $d->format('Y-m-d');
        $cur->modify("+{$step} months");
    }
    return $dates;
}

function seedDgmsRegisters(string $mineId, string $tenantId): void {
    $registers = [
        ['ACCIDENT_REGISTER',    'Accident & Dangerous Occurrence Register', 'MMR 1961 Reg. 20',  1],
        ['SAFETY_COMMITTEE',     'Safety Committee Proceedings',             'MMR 1961 Reg. 62',  30],
        ['EXPLOSIVE_CONSUMPTION','Explosive Consumption Register',           'Explosives Rules',  7],
        ['SHOTFIRER_COMPETENCY', 'Shotfirer Competency Register',            'MMR 1961 Reg. 173', 90],
        ['FIRST_AID',            'First-Aid Register',                       'MMR 1961 Reg. 55',  14],
        ['MACHINERY_REGISTER',   'Mining Machinery Register',                'MMR 1961 Reg. 79',  30],
        ['WEIGHBRIDGE_REGISTER', 'Weigh Bridge Register',                    'MCDR 2017',         1],
        ['EMPLOYMENT_REGISTER',  'Employment Register',                      'MMDR 1957',         30],
    ];
    $stmt = db()->prepare("
        INSERT IGNORE INTO dgms_register_status
        (id, tenant_id, mine_id, register_code, register_name, regulation_ref, last_updated_at, max_days_allowed)
        VALUES (?,?,?,?,?,?,?,?)
    ");
    foreach ($registers as [$code, $name, $reg, $maxDays]) {
        // Seed as "needs update" so score starts low, not falsely high
        $lastUpdated = date('Y-m-d H:i:s', strtotime("-" . ($maxDays + 1) . " days"));
        $stmt->execute([uuid(), $tenantId, $mineId, $code, $name, $reg, $lastUpdated, $maxDays]);
    }
}

json_err('Invalid request', 400);
