<?php
session_set_cookie_params([
    'lifetime' => 86400,   // 24 Stunden
    'httponly' => true,    // Kein JS-Zugriff auf das Cookie
    'secure'   => true,    // Nur über HTTPS senden
    'samesite' => 'Lax',
]);
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$area     = $_POST['area']     ?? '';
$password = $_POST['password'] ?? '';

if (!preg_match('/^[a-zA-Z0-9_-]+$/', $area)) {
    http_response_code(400);
    echo json_encode(['ok' => false]);
    exit;
}

// Passwörter nur auf dem Server – SHA-256-Hashes der Klartextpasswörter
$PASSWORDS = [
    'aktionen' => '9b6fcb3d1877b41b17e0051e1ac4da83e1b20e9c91b73de5abb5189782f6160f',
    'team'     => '126d1337beb85580e514c90bfb75d92b90adb11feec2062ff01868e73f8444bb',
    'privat'   => '8fe9a4033f5d75198b568dd54c6af0824c5dbf00a3d2f9fdedebf2cd3bb2d3cf',
];

if (!isset($PASSWORDS[$area]) || !hash_equals($PASSWORDS[$area], hash('sha256', $password))) {
    http_response_code(401);
    echo json_encode(['ok' => false]);
    exit;
}

$_SESSION['auth_' . $area] = date('Y-m-d');
echo json_encode(['ok' => true]);
