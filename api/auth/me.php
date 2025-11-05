<?php
/**
 * Get Current User Endpoint
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $user = Auth::requireAuth();
    
    // Remove sensitive data
    unset($user['password']);
    
    echo json_encode(['user' => $user]);
    
} catch (Exception $e) {
    error_log('Get current user error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}

