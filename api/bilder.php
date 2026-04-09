<?php
session_set_cookie_params([
    'lifetime' => 86400,
    'httponly' => true,
    'secure'   => true,    // Nur über HTTPS senden
    'samesite' => 'Lax',
]);
session_start();
header('Content-Type: application/json');

$bereich = $_GET['bereich'] ?? '';
$id      = $_GET['id']      ?? '';

// Sicherheit: nur erlaubte Zeichen (verhindert Pfad-Traversal)
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $bereich) ||
    !preg_match('/^[a-zA-Z0-9_.()-]+$/', $id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige Parameter']);
    exit;
}

// Server-seitige Auth-Prüfung
if (($_SESSION['auth_' . $bereich] ?? '') !== date('Y-m-d')) {
    http_response_code(401);
    echo json_encode(['error' => 'Nicht authentifiziert']);
    exit;
}

$dir = __DIR__ . "/../bilder/$bereich/$id/";

if (!is_dir($dir)) {
    echo json_encode(['images' => []]);
    exit;
}

$images = [];
foreach (glob($dir . "*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}", GLOB_BRACE) as $file) {
    $name = basename($file);
    $images[] = [
        'original' => "/bilder/$bereich/$id/$name",
        'lightbox' => "/api/thumb.php?bereich=$bereich&id=$id&datei=$name&w=1600",
        'thumb'    => "/api/thumb.php?bereich=$bereich&id=$id&datei=$name&w=400",
    ];
}

// Sortieren nach Dateiname (natürliche Sortierung)
usort($images, fn($a, $b) => strnatcasecmp(basename($a['original']), basename($b['original'])));

echo json_encode(['images' => $images]);
