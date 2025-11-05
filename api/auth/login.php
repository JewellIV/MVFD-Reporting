<?php
/**
 * User Login Endpoint
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['username']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Username and password are required']);
        exit;
    }
    
    $db = Database::getInstance()->getConnection();
    $username = $data['username'];
    
    // Find user by username or email
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($data['password'], $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }
    
    if (!$user['isActive']) {
        http_response_code(403);
        echo json_encode(['error' => 'Account is inactive']);
        exit;
    }
    
    // Update last login
    $updateStmt = $db->prepare("UPDATE users SET lastLogin = NOW() WHERE id = ?");
    $updateStmt->execute([$user['id']]);
    
    // Generate token
    Auth::init();
    $token = Auth::generateToken($user['id']);
    
    echo json_encode([
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'firstName' => $user['firstName'],
            'lastName' => $user['lastName'],
            'role' => $user['role'],
            'badgeNumber' => $user['badgeNumber'],
            'department' => $user['department']
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Login error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error during login']);
}

