<?php
/**
 * User Registration Endpoint
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
    
    // Validation
    $errors = [];
    if (empty($data['username']) || strlen($data['username']) < 3) {
        $errors[] = 'Username must be at least 3 characters';
    }
    if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Valid email is required';
    }
    if (empty($data['password']) || strlen($data['password']) < 6) {
        $errors[] = 'Password must be at least 6 characters';
    }
    if (empty($data['firstName'])) {
        $errors[] = 'First name is required';
    }
    if (empty($data['lastName'])) {
        $errors[] = 'Last name is required';
    }
    
    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode(['errors' => $errors]);
        exit;
    }
    
    $db = Database::getInstance()->getConnection();
    
    // Check if user already exists
    $checkStmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ? OR badgeNumber = ?");
    $checkStmt->execute([
        $data['username'],
        $data['email'],
        $data['badgeNumber'] ?? ''
    ]);
    
    if ($checkStmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'User already exists']);
        exit;
    }
    
    // Hash password
    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
    
    // Insert user
    $stmt = $db->prepare("
        INSERT INTO users (username, email, password, firstName, lastName, badgeNumber, role, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    ");
    
    $role = $data['role'] ?? 'firefighter';
    $stmt->execute([
        $data['username'],
        $data['email'],
        $hashedPassword,
        $data['firstName'],
        $data['lastName'],
        $data['badgeNumber'] ?? null,
        $role
    ]);
    
    $userId = $db->lastInsertId();
    
    // Generate token
    Auth::init();
    $token = Auth::generateToken($userId);
    
    echo json_encode([
        'token' => $token,
        'user' => [
            'id' => $userId,
            'username' => $data['username'],
            'email' => $data['email'],
            'firstName' => $data['firstName'],
            'lastName' => $data['lastName'],
            'role' => $role,
            'badgeNumber' => $data['badgeNumber'] ?? null
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Registration error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error during registration']);
}

