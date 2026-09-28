<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
$_SERVER['REQUEST_METHOD'] = 'POST';
$_POST = ['email' => 'test@example.com', 'password' => 'password123'];
require_once 'backend/auth/login.php';
