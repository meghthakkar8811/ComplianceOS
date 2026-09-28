<?php
// router.php — used with PHP built-in server
// Run: php -S localhost:8000 router.php

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve existing files directly
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Root redirect
if ($uri === '/') {
    header('Location: /frontend/login.html');
    exit;
}

// 404 fallback
http_response_code(404);
echo '404 Not Found';
