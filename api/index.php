<?php
/**
 * API Router - Routes requests to appropriate endpoints
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get request path
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = $_SERVER['SCRIPT_NAME'];
$path = str_replace(dirname($scriptName), '', $requestUri);
$path = trim($path, '/');
$parts = explode('/', $path);

// Remove 'api' prefix if present
if (!empty($parts[0]) && $parts[0] === 'api') {
    array_shift($parts);
}

// Route to appropriate endpoint
$route = !empty($parts[0]) ? $parts[0] : 'health';
$action = !empty($parts[1]) ? $parts[1] : 'index';
$id = !empty($parts[2]) ? $parts[2] : null;

// Route mapping
$routes = [
    'auth' => [
        'login' => 'auth/login.php',
        'register' => 'auth/register.php',
        'me' => 'auth/me.php'
    ],
    'health' => 'health.php',
    'roster' => 'roster.php',
    'nemsis' => 'nemsis.php',
    'nfirs' => 'nfirs.php',
    'neris' => 'neris.php'
];

try {
    if ($route === 'auth' && isset($routes['auth'][$action])) {
        require_once __DIR__ . '/' . $routes['auth'][$action];
    } elseif (isset($routes[$route])) {
        if (is_array($routes[$route])) {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        } else {
            require_once __DIR__ . '/' . $routes[$route];
        }
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Route not found', 'path' => $path]);
    }
} catch (Exception $e) {
    error_log('API routing error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

