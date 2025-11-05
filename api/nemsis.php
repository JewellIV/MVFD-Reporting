<?php
/**
 * NEMSIS API Endpoint
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$method = $_SERVER['REQUEST_METHOD'];
$user = Auth::requireAuth();

try {
    $db = Database::getInstance()->getConnection();
    
    switch ($method) {
        case 'GET':
            // Get NEMSIS records
            $stmt = $db->prepare("
                SELECT id, recordData, createdBy, createdAt, updatedAt
                FROM nemsis_records
                WHERE createdBy = ?
                ORDER BY createdAt DESC
            ");
            $stmt->execute([$user['id']]);
            $records = $stmt->fetchAll();
            
            echo json_encode(['records' => $records]);
            break;
            
        case 'POST':
            // Create new NEMSIS record
            $data = json_decode(file_get_contents('php://input'), true);
            // Implementation for creating record
            echo json_encode(['message' => 'NEMSIS record creation not yet fully implemented']);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    error_log('NEMSIS API error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}

