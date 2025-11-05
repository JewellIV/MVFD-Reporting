<?php
/**
 * Database Configuration
 * Connects to MySQL database
 */

require_once __DIR__ . '/env.php';

class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        $host = env('DB_HOST', 'localhost');
        $port = env('DB_PORT', 3306);
        $dbname = env('DB_NAME');
        $username = env('DB_USER');
        $password = env('DB_PASS');
        
        if (empty($dbname) || empty($username)) {
            throw new Exception('Database configuration missing: DB_NAME and DB_USER are required');
        }
        
        try {
            $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];
            
            $this->connection = new PDO($dsn, $username, $password, $options);
        } catch (PDOException $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            throw new Exception('Database connection failed');
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    // Prevent cloning and unserialization
    private function __clone() {}
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

