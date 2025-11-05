<?php
/**
 * Environment Variable Loader
 * Loads from .env file or environment variables
 */

function loadEnv($filePath) {
    if (!file_exists($filePath)) {
        return;
    }
    
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove quotes if present
            $value = trim($value, '"\'');
            
            // Set environment variable if not already set
            if (!getenv($key)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}

// Load .env file from api directory or parent directory
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    loadEnv($envFile);
}

// Helper function to get env with default
function env($key, $default = null) {
    $value = getenv($key);
    return $value !== false ? $value : $default;
}

