<?php
// backend/config/env.php — Load .env file
// Include this at the top of database.php if you want .env file support

$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $key = trim($key); $val = trim($val);
        if (!getenv($key)) putenv("$key=$val");
        if (!isset($_ENV[$key])) $_ENV[$key] = $val;
    }
}
