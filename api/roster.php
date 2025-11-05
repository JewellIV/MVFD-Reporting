<?php
/**
 * Roster API Endpoint
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
            // Get roster members
            $stmt = $db->query("
                SELECT id, username, email, firstName, lastName, role, badgeNumber, 
                       department, isActive, createdAt, updatedAt
                FROM users
                WHERE isActive = 1
                ORDER BY lastName, firstName
            ");
            $members = $stmt->fetchAll();
            
            echo json_encode(['members' => $members]);
            break;
            
        case 'POST':
            // Create new member (admin only)
            Auth::requireRole(['admin']);
            
            $data = json_decode(file_get_contents('php://input'), true);
            // Implementation for creating member
            echo json_encode(['message' => 'Member creation not yet implemented']);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    error_log('Roster API error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}

