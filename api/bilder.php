<?php
header('Content-Type: application/json');

$bereich = $_GET['bereich'] ?? '';
$id      = $_GET['id']      ?? '';

// Nur erlaubte Zeichen (Sicherheit gegen Pfad-Traversal)
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $bereich) ||
    !preg_match('/^[a-zA-Z0-9_.()-]+$/', $id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige Parameter']);
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
    // cover.jpg nicht in der Galerie anzeigen
    if (strtolower($name) === 'cover.jpg') continue;
    $images[] = "/bilder/$bereich/$id/$name";
}

natcasesort($images);
echo json_encode(['images' => array_values($images)]);
