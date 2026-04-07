<?php
// Generiert verkleinerte Bilder on-the-fly und speichert sie im Cache

$bereich = $_GET['bereich'] ?? '';
$id      = $_GET['id']      ?? '';
$datei   = $_GET['datei']   ?? '';
$width   = (int)($_GET['w'] ?? 400);

// Sicherheit: nur erlaubte Zeichen
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $bereich) ||
    !preg_match('/^[a-zA-Z0-9_.()-]+$/', $id)    ||
    !preg_match('/^[a-zA-Z0-9_.-]+$/', $datei)   ||
    !in_array($width, [400, 800, 1200, 1600])) {
    http_response_code(400);
    exit;
}

$srcFile   = __DIR__ . "/../bilder/$bereich/$id/$datei";
$cacheDir  = __DIR__ . "/../bilder_cache/$bereich/$id/";
$cacheFile = $cacheDir . "w{$width}_" . $datei;

// Quelldatei muss existieren
if (!file_exists($srcFile)) {
    http_response_code(404);
    exit;
}

// Cache-Verzeichnis anlegen falls nötig
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Cache nutzen wenn vorhanden und aktuell
if (file_exists($cacheFile) && filemtime($cacheFile) >= filemtime($srcFile)) {
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=2592000'); // 30 Tage
    readfile($cacheFile);
    exit;
}

// Bild laden
$ext = strtolower(pathinfo($datei, PATHINFO_EXTENSION));
// GD verfügbar?
if (!function_exists('imagecreatefromjpeg')) {
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=2592000');
    readfile($srcFile);
    exit;
}

if ($ext === 'jpg' || $ext === 'jpeg') {
    $src = @imagecreatefromjpeg($srcFile);
} elseif ($ext === 'png') {
    $src = @imagecreatefrompng($srcFile);
} elseif ($ext === 'webp') {
    $src = @imagecreatefromwebp($srcFile);
} else {
    $src = null;
}

if (!$src) {
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=2592000');
    readfile($srcFile);
    exit;
}

$origW = imagesx($src);
$origH = imagesy($src);

// Nur verkleinern, nie vergrößern
if ($origW <= $width) {
    imagedestroy($src);
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=2592000');
    readfile($srcFile);
    exit;
}

$newH = (int)round($origH * $width / $origW);
$dst  = imagecreatetruecolor($width, $newH);

// PNG-Transparenz erhalten
if ($ext === 'png') {
    imagealphablending($dst, false);
    imagesavealpha($dst, true);
}

imagecopyresampled($dst, $src, 0, 0, 0, 0, $width, $newH, $origW, $origH);

// Qualität: 85 für Lightbox (1600px), 80 für Thumbnails (400px)
$quality = ($width >= 800) ? 85 : 80;
imagedestroy($src);

// In Cache speichern (ignorieren falls keine Schreibrechte)
@imagejpeg($dst, $cacheFile, $quality);

header('Content-Type: image/jpeg');
header('Cache-Control: public, max-age=2592000');
if (file_exists($cacheFile)) {
    imagedestroy($dst);
    readfile($cacheFile);
} else {
    // Direkt ausgeben ohne Cache
    imagejpeg($dst, null, $quality);
    imagedestroy($dst);
}
