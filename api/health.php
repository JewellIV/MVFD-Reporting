<?php
/**
 * Health Check Endpoint
 */

require_once __DIR__ . '/config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query("SELECT 1");
    $dbStatus = $stmt !== false ? 'connected' : 'disconnected';
    
    echo json_encode([
        'status' => 'healthy',
        'database' => $dbStatus,
        'timestamp' => date('c'),
        'service' => 'Mangohick Fire Reporting API'
    ]);
    
} catch (Exception $e) {
    http_response_code(503);
    echo json_encode([
        'status' => 'unhealthy',
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
}

