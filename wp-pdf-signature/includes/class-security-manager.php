<?php
/**
 * 安全管理類
 */

if (!defined('ABSPATH')) {
    exit;
}

class WP_PDF_Signature_Security_Manager {
    
    public function __construct() {
        add_action('init', array($this, 'security_headers'));
        add_filter('wp_pdf_signature_validate_upload', array($this, 'validate_file_upload'), 10, 2);
        add_action('wp_pdf_signature_log_activity', array($this, 'log_security_activity'), 10, 3);
    }
    
    /**
     * 設定安全標頭
     */
    public function security_headers() {
        if (get_query_var('pdf_signature_id')) {
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: SAMEORIGIN');
            header('X-XSS-Protection: 1; mode=block');
            header('Referrer-Policy: strict-origin-when-cross-origin');
        }
    }
    
    /**
     * 驗證文件上傳
     */
    public function validate_file_upload($is_valid, $file) {
        // 檢查文件大小
        $max_size = get_option('wp_pdf_signature_upload_max_size', 10) * 1024 * 1024;
        if ($file['size'] > $max_size) {
            return new WP_Error('file_too_large', '文件大小超過限制');
        }
        
        // 檢查文件類型
        $allowed_types = array('application/pdf');
        if (!in_array($file['type'], $allowed_types)) {
            return new WP_Error('invalid_file_type', '僅允許PDF文件');
        }
        
        // 檢查文件內容
        if (!$this->is_valid_pdf_content($file['tmp_name'])) {
            return new WP_Error('invalid_pdf_content', 'PDF文件內容無效');
        }
        
        // 病毒掃描（如果可用）
        if (function_exists('clamav_scan_file')) {
            $scan_result = clamav_scan_file($file['tmp_name']);
            if ($scan_result !== CLAMAV_CLEAN) {
                return new WP_Error('virus_detected', '檢測到惡意文件');
            }
        }
        
        return $is_valid;
    }
    
    /**
     * 驗證PDF文件內容
     */
    private function is_valid_pdf_content($file_path) {
        $handle = fopen($file_path, 'rb');
        if (!$handle) {
            return false;
        }
        
        // 檢查PDF標頭
        $header = fread($handle, 8);
        if (substr($header, 0, 4) !== '%PDF') {
            fclose($handle);
            return false;
        }
        
        // 檢查PDF結構
        fseek($handle, -1024, SEEK_END);
        $footer = fread($handle, 1024);
        fclose($handle);
        
        // 查找PDF結尾標記
        if (strpos($footer, '%%EOF') === false) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 加密敏感數據
     */
    public function encrypt_data($data, $key = null) {
        if (!$key) {
            $key = $this->get_encryption_key();
        }
        
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);
        
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * 解密敏感數據
     */
    public function decrypt_data($encrypted_data, $key = null) {
        if (!$key) {
            $key = $this->get_encryption_key();
        }
        
        $data = base64_decode($encrypted_data);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        
        return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv);
    }
    
    /**
     * 獲取加密密鑰
     */
    private function get_encryption_key() {
        $key = get_option('wp_pdf_signature_encryption_key');
        
        if (!$key) {
            $key = wp_generate_password(32, true, true);
            update_option('wp_pdf_signature_encryption_key', $key);
        }
        
        return $key;
    }
    
    /**
     * 生成安全哈希
     */
    public function generate_hash($data, $salt = null) {
        if (!$salt) {
            $salt = wp_salt('secure_auth');
        }
        
        return hash_hmac('sha256', $data, $salt);
    }
    
    /**
     * 驗證哈希
     */
    public function verify_hash($data, $hash, $salt = null) {
        if (!$salt) {
            $salt = wp_salt('secure_auth');
        }
        
        $expected_hash = hash_hmac('sha256', $data, $salt);
        return hash_equals($expected_hash, $hash);
    }
    
    /**
     * 記錄安全活動
     */
    public function log_security_activity($action, $user_id, $data = array()) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'pdf_signature_security_log';
        
        // 如果表不存在，創建它
        $this->create_security_log_table();
        
        $log_data = array(
            'action' => $action,
            'user_id' => $user_id,
            'ip_address' => $this->get_client_ip(),
            'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT']),
            'data' => json_encode($data),
            'timestamp' => current_time('mysql')
        );
        
        $wpdb->insert($table_name, $log_data);
    }
    
    /**
     * 創建安全日誌表
     */
    private function create_security_log_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'pdf_signature_security_log';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            action varchar(100) NOT NULL,
            user_id bigint(20) DEFAULT NULL,
            ip_address varchar(45) NOT NULL,
            user_agent text,
            data longtext,
            timestamp datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY action (action),
            KEY user_id (user_id),
            KEY timestamp (timestamp)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * 獲取客戶端IP地址
     */
    private function get_client_ip() {
        $ip_keys = array(
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR'
        );
        
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                $ip = $_SERVER[$key];
                if (strpos($ip, ',') !== false) {
                    $ip = explode(',', $ip)[0];
                }
                $ip = trim($ip);
                
                if (filter_var($ip, FILTER_VALIDATE_IP, 
                    FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
    
    /**
     * 檢查速率限制
     */
    public function check_rate_limit($action, $limit = 10, $window = 3600) {
        $cache_key = 'pdf_sig_rate_limit_' . $action . '_' . $this->get_client_ip();
        $current_count = wp_cache_get($cache_key);
        
        if ($current_count === false) {
            wp_cache_set($cache_key, 1, '', $window);
            return true;
        }
        
        if ($current_count >= $limit) {
            return false;
        }
        
        wp_cache_set($cache_key, $current_count + 1, '', $window);
        return true;
    }
    
    /**
     * 清理過期的安全日誌
     */
    public function cleanup_security_logs($days = 90) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'pdf_signature_security_log';
        $cutoff_date = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM $table_name WHERE timestamp < %s",
                $cutoff_date
            )
        );
    }
    
    /**
     * 驗證文件完整性
     */
    public function verify_file_integrity($file_path, $expected_hash) {
        if (!file_exists($file_path)) {
            return false;
        }
        
        $actual_hash = hash_file('sha256', $file_path);
        return hash_equals($expected_hash, $actual_hash);
    }
    
    /**
     * 生成安全令牌
     */
    public function generate_secure_token($length = 32) {
        return bin2hex(random_bytes($length / 2));
    }
    
    /**
     * 驗證簽名完整性
     */
    public function verify_signature_integrity($signature_data, $metadata) {
        // 檢查簽名數據格式
        if (!preg_match('/^data:image\/png;base64,/', $signature_data)) {
            return false;
        }
        
        // 提取並驗證base64數據
        $base64_data = str_replace('data:image/png;base64,', '', $signature_data);
        $decoded_data = base64_decode($base64_data);
        
        if (!$decoded_data) {
            return false;
        }
        
        // 驗證圖片格式
        $image_info = getimagesizefromstring($decoded_data);
        if (!$image_info || $image_info['mime'] !== 'image/png') {
            return false;
        }
        
        // 檢查圖片尺寸限制
        if ($image_info[0] > 800 || $image_info[1] > 400) {
            return false;
        }
        
        // 檢查元數據一致性
        if (isset($metadata['timestamp'])) {
            $time_diff = abs(time() - strtotime($metadata['timestamp']));
            if ($time_diff > 3600) { // 1小時內
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 審計日誌查詢
     */
    public function get_audit_logs($filters = array()) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'pdf_signature_security_log';
        $where_clauses = array('1=1');
        $values = array();
        
        if (!empty($filters['action'])) {
            $where_clauses[] = 'action = %s';
            $values[] = $filters['action'];
        }
        
        if (!empty($filters['user_id'])) {
            $where_clauses[] = 'user_id = %d';
            $values[] = $filters['user_id'];
        }
        
        if (!empty($filters['ip_address'])) {
            $where_clauses[] = 'ip_address = %s';
            $values[] = $filters['ip_address'];
        }
        
        if (!empty($filters['date_from'])) {
            $where_clauses[] = 'timestamp >= %s';
            $values[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $where_clauses[] = 'timestamp <= %s';
            $values[] = $filters['date_to'];
        }
        
        $where_sql = implode(' AND ', $where_clauses);
        $limit = isset($filters['limit']) ? intval($filters['limit']) : 100;
        
        $sql = "SELECT * FROM $table_name WHERE $where_sql ORDER BY timestamp DESC LIMIT $limit";
        
        if (!empty($values)) {
            $sql = $wpdb->prepare($sql, $values);
        }
        
        return $wpdb->get_results($sql, ARRAY_A);
    }
}