<?php
echo "<h2>GD:</h2>";
echo function_exists('imagecreatefromjpeg') ? "✅ GD aktiv" : "❌ GD fehlt";

echo "<h2>Schreibrechte bilder_cache:</h2>";
$dir = __DIR__ . "/../bilder_cache/";
if (!is_dir($dir)) mkdir($dir, 0755, true);
echo is_writable($dir) ? "✅ Schreibrechte OK" : "❌ Keine Schreibrechte";

echo "<h2>PHP-Version:</h2>";
echo phpversion();

echo "<h2>Geladene Extensions:</h2>";
echo implode(", ", get_loaded_extensions());
