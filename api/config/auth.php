<?php
/**
 * Authentication and JWT Helper
 */

require_once __DIR__ . '/env.php';

class Auth {
    private static $secret;
    
    public static function init() {
        self::$secret = env('JWT_SECRET', '');
        if (empty(self::$secret)) {
            throw new Exception('JWT_SECRET not set in environment');
        }
    }
    
    /**
     * Generate JWT token
     */
    public static function generateToken($userId, $expiresIn = 86400) {
        self::init();
        
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'userId' => $userId,
            'iat' => time(),
            'exp' => time() + $expiresIn
        ]);
        
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }
    
    /**
     * Verify and decode JWT token
     */
    public static function verifyToken($token) {
        self::init();
        
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }
        
        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        $base64UrlSignatureCheck = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        if ($base64UrlSignature !== $base64UrlSignatureCheck) {
            return false;
        }
        
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64UrlPayload)), true);
        
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false; // Token expired
        }
        
        return $payload;
    }
    
    /**
     * Get current user from token
     */
    public static function getCurrentUser() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return null;
        }
        
        $token = $matches[1];
        $decoded = self::verifyToken($token);
        
        if (!$decoded || !isset($decoded['userId'])) {
            return null;
        }
        
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT id, username, email, firstName, lastName, role, badgeNumber, department, isActive FROM users WHERE id = ?");
        $stmt->execute([$decoded['userId']]);
        $user = $stmt->fetch();
        
        return $user ?: null;
    }
    
    /**
     * Require authentication middleware
     */
    public static function requireAuth() {
        $user = self::getCurrentUser();
        if (!$user) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        return $user;
    }
    
    /**
     * Require specific role
     */
    public static function requireRole($roles) {
        $user = self::requireAuth();
        if (!in_array($user['role'], (array)$roles)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Insufficient permissions']);
            exit;
        }
        return $user;
    }
}

