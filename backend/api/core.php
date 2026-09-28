<?php
// backend/api/core.php — Production, Royalty, Compliance, DGMS, Dashboard
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Auth
$token = null;
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (preg_match('/Bearer (.+)/', $authHeader, $m)) $token = $m[1];
if (!$token && isset($_COOKIE['cos_session'])) $token = $_COOKIE['cos_session'];
if (!$token) json_err('Unauthorized', 401);

$tokenHash = hash_token($token);
$stmt = db()->prepare("
    SELECT u.*, t.company_name, t.plan FROM sessions s
    JOIN users u ON u.id = s.user_id JOIN tenants t ON t.id = u.tenant_id
    WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1
");
$stmt->execute([$tokenHash]);
$user = $stmt->fetch();
if (!$user) json_err('Unauthorized', 401);

$tenantId = $user['tenant_id'];
$userId   = $user['id'];
$method   = $_SERVER['REQUEST_METHOD'];
$endpoint = $_GET['ep'] ?? '';
$mineId   = $_GET['mine_id'] ?? '';

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
if ($endpoint === 'dashboard' && $mineId) {
    $today      = date('Y-m-d');
    $monthStart = date('Y-m-01');
    $monthEnd   = date('Y-m-t');

    // Mine info
    $stmt = db()->prepare("SELECT * FROM mines WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$mineId, $tenantId]);
    $mine = $stmt->fetch();
    if (!$mine) json_err('Mine not found', 404);

    // Monthly production totals
    $stmt = db()->prepare("
        SELECT COALESCE(SUM(quantity_produced_mt),0) AS total_produced,
               COALESCE(SUM(quantity_dispatched_mt),0) AS total_dispatched,
               COUNT(*) AS entry_count
        FROM production_entries WHERE mine_id=? AND entry_date BETWEEN ? AND ?
    ");
    $stmt->execute([$mineId, $monthStart, $monthEnd]);
    $prodSummary = $stmt->fetch();

    // Today's production
    $stmt = db()->prepare("SELECT COALESCE(SUM(quantity_produced_mt),0) AS today_prod FROM production_entries WHERE mine_id=? AND entry_date=?");
    $stmt->execute([$mineId, $today]);
    $todayProd = $stmt->fetchColumn();

    // Latest royalty calculation
    $stmt = db()->prepare("SELECT * FROM royalty_calculations WHERE mine_id=? ORDER BY period_month DESC LIMIT 1");
    $stmt->execute([$mineId]);
    $royalty = $stmt->fetch();

    // Pending & overdue deadlines
    $stmt = db()->prepare("SELECT COUNT(*) FROM compliance_deadlines WHERE mine_id=? AND status='PENDING'");
    $stmt->execute([$mineId]); $pending = (int)$stmt->fetchColumn();

    $stmt = db()->prepare("SELECT COUNT(*) FROM compliance_deadlines WHERE mine_id=? AND status='PENDING' AND due_date < ?");
    $stmt->execute([$mineId, $today]); $overdue = (int)$stmt->fetchColumn();

    // Upcoming 5 deadlines
    $stmt = db()->prepare("SELECT * FROM compliance_deadlines WHERE mine_id=? AND status='PENDING' AND due_date >= ? ORDER BY due_date ASC LIMIT 5");
    $stmt->execute([$mineId, $today]);
    $deadlines = $stmt->fetchAll();

    // DGMS score
    $dgms = computeDgmsScore($mineId);

    // Production chart (last 6 months)
    $chart = [];
    for ($i = 5; $i >= 0; $i--) {
        $d     = new DateTime("first day of -$i month");
        $start = $d->format('Y-m-01');
        $end   = $d->format('Y-m-t');
        $stmt  = db()->prepare("SELECT COALESCE(SUM(quantity_produced_mt),0), COALESCE(SUM(quantity_dispatched_mt),0) FROM production_entries WHERE mine_id=? AND entry_date BETWEEN ? AND ?");
        $stmt->execute([$mineId, $start, $end]);
        [$prod, $disp] = $stmt->fetch(PDO::FETCH_NUM);
        $chart[] = ['month' => $d->format('M'), 'year' => $d->format('Y'), 'produced' => (float)$prod, 'dispatched' => (float)$disp];
    }

    // Expiring documents (next 90 days)
    $threshold = date('Y-m-d', strtotime('+90 days'));
    $stmt = db()->prepare("SELECT COUNT(*) FROM compliance_documents WHERE mine_id=? AND expiry_date IS NOT NULL AND expiry_date <= ?");
    $stmt->execute([$mineId, $threshold]);
    $expiringDocs = (int)$stmt->fetchColumn();

    // Health scores
    $ibmScore     = $pending === 0 ? 100 : max(0, (int)round((1 - $overdue / max($pending,1)) * 100));
    $royaltyScore = !$royalty ? 40 : ($royalty['challan_status'] === 'PAID' ? 100 : ($royalty['challan_status'] === 'GENERATED' ? 80 : 60));
    $dgmsScore    = $dgms['overall_score'];
    $envScore     = 55;
    $overall      = (int)round($ibmScore * 0.30 + $royaltyScore * 0.25 + $dgmsScore * 0.30 + $envScore * 0.15);

    json_ok([
        'mine'            => $mine,
        'health'          => ['overall' => $overall, 'ibm' => $ibmScore, 'royalty' => $royaltyScore, 'dgms' => $dgmsScore, 'environment' => $envScore],
        'kpis'            => ['month_produced_mt' => (float)$prodSummary['total_produced'], 'month_dispatched_mt' => (float)$prodSummary['total_dispatched'], 'today_produced_mt' => (float)$todayProd, 'pending_filings' => $pending, 'overdue_filings' => $overdue, 'expiring_documents' => $expiringDocs],
        'royalty_current' => $royalty,
        'deadlines'       => array_map(fn($d) => [...$d, 'days_until' => (int)((strtotime($d['due_date']) - time()) / 86400)], $deadlines),
        'production_chart'=> $chart,
        'dgms'            => $dgms,
    ]);
}

// ════════════════════════════════════════════════════════════
// PRODUCTION ENTRIES
// ════════════════════════════════════════════════════════════
if ($endpoint === 'production') {
    if ($method === 'GET') {
        $month = $_GET['month'] ?? date('Y-m');
        [$y, $m] = explode('-', $month);
        $start = "$y-$m-01";
        $end   = date('Y-m-t', strtotime($start));
        $stmt  = db()->prepare("SELECT * FROM production_entries WHERE mine_id=? AND tenant_id=? AND entry_date BETWEEN ? AND ? ORDER BY entry_date DESC, shift ASC");
        $stmt->execute([$mineId, $tenantId, $start, $end]);
        json_ok($stmt->fetchAll());
    }
    if ($method === 'POST') {
        $d = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $id = uuid();
        db()->prepare("
            INSERT INTO production_entries
            (id,tenant_id,mine_id,entry_date,shift,pit_section,mineral_grade,
             quantity_produced_mt,quantity_dispatched_mt,supervisor_name,remarks,created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ")->execute([
            $id, $tenantId, $mineId,
            $d['entry_date'], strtoupper($d['shift'] ?? 'MORNING'),
            $d['pit_section'] ?? '', $d['mineral_grade'] ?? '',
            (float)($d['quantity_produced_mt'] ?? 0),
            (float)($d['quantity_dispatched_mt'] ?? 0),
            $d['supervisor_name'] ?? '', $d['remarks'] ?? '',
            $userId,
        ]);
        audit('CREATE', 'production_entry', $id);
        $stmt = db()->prepare("SELECT * FROM production_entries WHERE id=?");
        $stmt->execute([$id]);
        json_ok($stmt->fetch(), 201);
    }
    if ($method === 'PATCH') {
        $entryId = $_GET['entry_id'] ?? '';
        if (!$entryId) json_err('entry_id required');
        db()->prepare("UPDATE production_entries SET status='VERIFIED' WHERE id=? AND tenant_id=?")
            ->execute([$entryId, $tenantId]);
        json_ok(['message' => 'Entry verified']);
    }
}

// ════════════════════════════════════════════════════════════
// ROYALTY
// ════════════════════════════════════════════════════════════
if ($endpoint === 'royalty_preview') {
    $state   = strtoupper(str_replace(' ', '_', $_GET['state'] ?? ''));
    $mineral = strtoupper(str_replace(' ', '_', $_GET['mineral'] ?? ''));
    $qty     = (float)($_GET['quantity_mt'] ?? 0);
    $advance = (int)($_GET['advance_paise'] ?? 0);

    if (!$state || !$mineral || $qty <= 0) json_err('state, mineral and quantity_mt required');

    $stmt = db()->prepare("SELECT * FROM royalty_rates WHERE state=? AND mineral=? AND (effective_to IS NULL OR effective_to >= CURDATE()) ORDER BY effective_from DESC LIMIT 1");
    $stmt->execute([$state, $mineral]);
    $rate = $stmt->fetch();
    if (!$rate) json_err("No royalty rate found for $mineral in $state", 404);

    $base  = (int)round($qty * $rate['rate_paise_per_mt']);
    $dmf   = (int)round($base * $rate['dmf_percent'] / 100);
    $nmet  = (int)round($base * $rate['nmet_percent'] / 100);
    $gross = $base + $dmf + $nmet;
    $net   = max(0, $gross - $advance);

    json_ok([
        'state' => $state, 'mineral' => $mineral,
        'quantity_mt' => $qty,
        'rate_paise' => $rate['rate_paise_per_mt'],
        'rate_rupees' => number_format($rate['rate_paise_per_mt'] / 100, 2),
        'base_royalty_paise' => $base,  'base_royalty_rupees' => number_format($base / 100, 2),
        'dmf_paise' => $dmf,            'dmf_rupees' => number_format($dmf / 100, 2),
        'nmet_paise' => $nmet,          'nmet_rupees' => number_format($nmet / 100, 2),
        'gross_paise' => $gross,        'gross_rupees' => number_format($gross / 100, 2),
        'advance_paise' => $advance,    'advance_rupees' => number_format($advance / 100, 2),
        'net_due_paise' => $net,        'net_due_rupees' => number_format($net / 100, 2),
        'source' => $rate['source_citation'],
        'effective_from' => $rate['effective_from'],
    ]);
}

if ($endpoint === 'royalty_compare') {
    $mineral = strtoupper(str_replace(' ', '_', $_GET['mineral'] ?? 'LIMESTONE'));
    $stmt = db()->prepare("SELECT state, rate_paise_per_mt, effective_from, source_citation FROM royalty_rates WHERE mineral=? AND (effective_to IS NULL OR effective_to >= CURDATE()) ORDER BY rate_paise_per_mt ASC");
    $stmt->execute([$mineral]);
    $rows = $stmt->fetchAll();
    json_ok(array_map(fn($r) => [...$r, 'rate_rupees' => number_format($r['rate_paise_per_mt']/100, 2)], $rows));
}

if ($endpoint === 'royalty_calculate' && $method === 'POST') {
    $d       = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $mine    = db()->prepare("SELECT * FROM mines WHERE id=? AND tenant_id=?")->execute([$mineId, $tenantId]) ? null : null;
    $stmt    = db()->prepare("SELECT * FROM mines WHERE id=? AND tenant_id=?");
    $stmt->execute([$mineId, $tenantId]);
    $mineRow = $stmt->fetch();
    if (!$mineRow) json_err('Mine not found', 404);

    $period  = ($d['period_month'] ?? date('Y-m')) . '-01';
    $qty     = (float)($d['quantity_mt'] ?? 0);
    $advance = (int)($d['advance_paise'] ?? 0);

    $stmt = db()->prepare("SELECT * FROM royalty_rates WHERE state=? AND mineral=? AND effective_from<=? AND (effective_to IS NULL OR effective_to>=?) ORDER BY effective_from DESC LIMIT 1");
    $stmt->execute([$mineRow['state'], $mineRow['mineral'], $period, $period]);
    $rate = $stmt->fetch();
    if (!$rate) json_err('No rate found for this mine\'s state and mineral', 404);

    $base  = (int)round($qty * $rate['rate_paise_per_mt']);
    $dmf   = (int)round($base * $rate['dmf_percent'] / 100);
    $nmet  = (int)round($base * $rate['nmet_percent'] / 100);
    $gross = $base + $dmf + $nmet;
    $net   = max(0, $gross - $advance);

    $id = uuid();
    db()->prepare("
        INSERT INTO royalty_calculations
        (id,tenant_id,mine_id,period_month,quantity_mt,rate_paise_per_mt,
         base_royalty_paise,dmf_paise,nmet_paise,gross_liability_paise,
         advance_paid_paise,net_due_paise,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE quantity_mt=VALUES(quantity_mt),
        base_royalty_paise=VALUES(base_royalty_paise),net_due_paise=VALUES(net_due_paise)
    ")->execute([$id,$tenantId,$mineId,$period,$qty,$rate['rate_paise_per_mt'],$base,$dmf,$nmet,$gross,$advance,$net,$userId]);
    audit('CREATE','royalty_calculation',$id);

    $stmt = db()->prepare("SELECT * FROM royalty_calculations WHERE mine_id=? AND period_month=?");
    $stmt->execute([$mineId,$period]);
    json_ok($stmt->fetch(), 201);
}

// ════════════════════════════════════════════════════════════
// COMPLIANCE DEADLINES
// ════════════════════════════════════════════════════════════
if ($endpoint === 'deadlines') {
    if ($method === 'GET') {
        $auth   = $_GET['authority'] ?? '';
        $status = $_GET['status'] ?? '';
        $sql    = "SELECT * FROM compliance_deadlines WHERE mine_id=? AND tenant_id=?";
        $params = [$mineId, $tenantId];
        if ($auth)   { $sql .= " AND authority=?";   $params[] = $auth; }
        if ($status) { $sql .= " AND status=?";      $params[] = $status; }
        $sql .= " ORDER BY due_date ASC";
        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        $today = time();
        json_ok(array_map(fn($r) => [...$r, 'days_until' => (int)((strtotime($r['due_date']) - $today) / 86400)], $rows));
    }
    if ($method === 'POST') {
        $d = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $refNo = $d['reference_number'] ?? '';
        db()->prepare("UPDATE compliance_deadlines SET status='SUBMITTED', submitted_at=NOW(), reference_number=? WHERE id=? AND tenant_id=?")
            ->execute([$refNo, $d['deadline_id'] ?? '', $tenantId]);
        audit('SUBMIT','compliance_deadline',$d['deadline_id']??'');
        json_ok(['message' => 'Deadline marked as submitted']);
    }
}

// ════════════════════════════════════════════════════════════
// DGMS READINESS
// ════════════════════════════════════════════════════════════
if ($endpoint === 'dgms') {
    if ($method === 'GET') {
        json_ok(computeDgmsScore($mineId));
    }
    if ($method === 'POST') {
        $d    = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $code = strtoupper($d['register_code'] ?? '');
        $notes= $d['notes'] ?? '';
        db()->prepare("UPDATE dgms_register_status SET last_updated_at=NOW(), notes=? WHERE mine_id=? AND register_code=?")
            ->execute([$notes, $mineId, $code]);
        json_ok(['message' => 'Register updated', 'new_score' => computeDgmsScore($mineId)]);
    }
}

// ════════════════════════════════════════════════════════════
// DGMS SCORE COMPUTATION
// ════════════════════════════════════════════════════════════
function computeDgmsScore(string $mineId): array {
    $stmt = db()->prepare("SELECT * FROM dgms_register_status WHERE mine_id=?");
    $stmt->execute([$mineId]);
    $registers = $stmt->fetchAll();

    $weights = ['ACCIDENT_REGISTER'=>1.5,'SAFETY_COMMITTEE'=>1.0,'EXPLOSIVE_CONSUMPTION'=>1.0,
                'SHOTFIRER_COMPETENCY'=>0.8,'FIRST_AID'=>0.8,'MACHINERY_REGISTER'=>1.0,
                'WEIGHBRIDGE_REGISTER'=>1.0,'EMPLOYMENT_REGISTER'=>0.9];

    $weightedSum = 0; $totalWeight = 0;
    $scores = [];

    foreach ($registers as $r) {
        $daysSince = max(0, (int)((time() - strtotime($r['last_updated_at'])) / 86400));
        $score     = max(0, (int)round(100 - (100 * $daysSince / max($r['max_days_allowed'], 1))));
        $weight    = $weights[$r['register_code']] ?? 1.0;
        $weightedSum += $score * $weight;
        $totalWeight += $weight;
        $scores[] = [...$r, 'score' => $score, 'days_since_update' => $daysSince,
            'status' => $score >= 70 ? 'green' : ($score >= 40 ? 'amber' : 'red')];
    }

    $overall = $totalWeight > 0 ? (int)round($weightedSum / $totalWeight) : 0;
    $verdict = $overall >= 80 ? 'GOOD' : ($overall >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL');
    return ['overall_score' => $overall, 'verdict' => $verdict, 'registers' => $scores];
}

// ════════════════════════════════════════════════════════════
// DOCUMENTS
// ════════════════════════════════════════════════════════════
if ($endpoint === 'documents') {
    if ($method === 'GET') {
        $cat = $_GET['category'] ?? '';
        $sql = "SELECT * FROM compliance_documents WHERE mine_id=? AND tenant_id=?";
        $params = [$mineId, $tenantId];
        if ($cat) { $sql .= " AND category=?"; $params[] = $cat; }
        $sql .= " ORDER BY created_at DESC";
        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        json_ok($stmt->fetchAll());
    }
    if ($method === 'POST') {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            json_err('File upload failed or missing');
        }
        
        $name = $_POST['name'] ?? '';
        $category = $_POST['category'] ?? 'OTHER';
        $docType = $_POST['document_type'] ?? '';
        $issued = empty($_POST['issued_date']) ? null : $_POST['issued_date'];
        $expiry = empty($_POST['expiry_date']) ? null : $_POST['expiry_date'];
        
        if (!$name || !$docType) json_err('Name and document type required');
        
        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['pdf', 'jpg', 'jpeg', 'png'])) json_err('Invalid file type');
        if ($file['size'] > 10 * 1024 * 1024) json_err('File exceeds 10MB limit');
        
        $uploadDir = __DIR__ . '/../../uploads/documents/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        
        $id = uuid();
        $filename = $id . '.' . $ext;
        $dest = $uploadDir . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            json_err('Failed to save uploaded file');
        }
        
        $filePath = '/uploads/documents/' . $filename;
        
        db()->prepare("
            INSERT INTO compliance_documents 
            (id, tenant_id, mine_id, name, category, document_type, file_path, issued_date, expiry_date, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            $id, $tenantId, $mineId, $name, $category, $docType, $filePath, $issued, $expiry, $userId
        ]);
        
        audit('CREATE', 'document', $id);
        json_ok(['message' => 'Document saved', 'file_path' => $filePath]);
    }
}

json_err('Invalid endpoint', 400);
