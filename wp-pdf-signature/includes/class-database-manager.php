<?php
/**
 * 資料庫管理類
 */

if (!defined('ABSPATH')) {
    exit;
}

class WP_PDF_Signature_Database_Manager {
    
    private $version;
    private $tables;
    
    public function __construct() {
        $this->version = '1.0.0';
        $this->tables = array(
            'signature_logs' => $this->get_signature_logs_table_name(),
            'signature_fields' => $this->get_signature_fields_table_name(),
            'security_log' => $this->get_security_log_table_name(),
            'document_stats' => $this->get_document_stats_table_name()
        );
        
        add_action('wp_pdf_signature_upgrade_database', array($this, 'upgrade_database'));
    }
    
    /**
     * 獲取表名
     */
    private function get_signature_logs_table_name() {
        global $wpdb;
        return $wpdb->prefix . 'pdf_signature_logs';
    }
    
    private function get_signature_fields_table_name() {
        global $wpdb;
        return $wpdb->prefix . 'pdf_signature_fields';
    }
    
    private function get_security_log_table_name() {
        global $wpdb;
        return $wpdb->prefix . 'pdf_signature_security_log';
    }
    
    private function get_document_stats_table_name() {
        global $wpdb;
        return $wpdb->prefix . 'pdf_signature_document_stats';
    }
    
    /**
     * 創建所有必要的資料庫表
     */
    public function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        $tables_sql = array();
        
        // 簽名記錄表
        $tables_sql[] = "CREATE TABLE {$this->tables['signature_logs']} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            document_id bigint(20) NOT NULL,
            user_id bigint(20) DEFAULT NULL,
            signature_data longtext NOT NULL,
            signature_hash varchar(255) NOT NULL,
            signer_name varchar(255) NOT NULL,
            signer_email varchar(255) NOT NULL,
            signer_phone varchar(50) DEFAULT NULL,
            signer_ip varchar(45) NOT NULL,
            user_agent text NOT NULL,
            signature_position text NOT NULL,
            signature_metadata text DEFAULT NULL,
            status varchar(20) DEFAULT 'pending',
            verification_code varchar(100) DEFAULT NULL,
            verified_at datetime DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY document_id (document_id),
            KEY user_id (user_id),
            KEY status (status),
            KEY signer_email (signer_email),
            KEY signature_hash (signature_hash),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        // 簽名欄位表
        $tables_sql[] = "CREATE TABLE {$this->tables['signature_fields']} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            document_id bigint(20) NOT NULL,
            field_type varchar(50) NOT NULL,
            field_name varchar(255) NOT NULL,
            field_label varchar(255) DEFAULT NULL,
            field_position text NOT NULL,
            field_size text NOT NULL,
            field_properties text DEFAULT NULL,
            field_required tinyint(1) DEFAULT 0,
            field_order int(11) DEFAULT 0,
            page_number int(11) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY document_id (document_id),
            KEY field_type (field_type),
            KEY field_order (field_order),
            KEY page_number (page_number)
        ) $charset_collate;";
        
        // 安全日誌表
        $tables_sql[] = "CREATE TABLE {$this->tables['security_log']} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            action varchar(100) NOT NULL,
            user_id bigint(20) DEFAULT NULL,
            document_id bigint(20) DEFAULT NULL,
            ip_address varchar(45) NOT NULL,
            user_agent text DEFAULT NULL,
            request_data text DEFAULT NULL,
            response_data text DEFAULT NULL,
            severity varchar(20) DEFAULT 'info',
            timestamp datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY action (action),
            KEY user_id (user_id),
            KEY document_id (document_id),
            KEY ip_address (ip_address),
            KEY severity (severity),
            KEY timestamp (timestamp)
        ) $charset_collate;";
        
        // 文件統計表
        $tables_sql[] = "CREATE TABLE {$this->tables['document_stats']} (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            document_id bigint(20) NOT NULL,
            views_count int(11) DEFAULT 0,
            signature_attempts int(11) DEFAULT 0,
            completed_signatures int(11) DEFAULT 0,
            last_viewed datetime DEFAULT NULL,
            last_signed datetime DEFAULT NULL,
            average_completion_time int(11) DEFAULT NULL,
            bounce_rate decimal(5,2) DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY document_id (document_id),
            KEY last_viewed (last_viewed),
            KEY last_signed (last_signed)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        foreach ($tables_sql as $sql) {
            dbDelta($sql);
        }
        
        // 更新版本號
        update_option('wp_pdf_signature_db_version', $this->version);
    }
    
    /**
     * 升級資料庫
     */
    public function upgrade_database() {
        $current_version = get_option('wp_pdf_signature_db_version', '0.0.0');
        
        if (version_compare($current_version, $this->version, '<')) {
            $this->create_tables();
            $this->migrate_data($current_version);
        }
    }
    
    /**
     * 數據遷移
     */
    private function migrate_data($from_version) {
        global $wpdb;
        
        // 0.0.0 到 1.0.0 的遷移
        if (version_compare($from_version, '1.0.0', '<')) {
            // 添加新欄位到現有表
            $this->add_missing_columns();
            
            // 遷移舊數據格式
            $this->migrate_signature_data();
        }
    }
    
    /**
     * 添加缺失的欄位
     */
    private function add_missing_columns() {
        global $wpdb;
        
        $columns_to_add = array(
            'signature_logs' => array(
                'signer_phone' => "ADD COLUMN signer_phone varchar(50) DEFAULT NULL AFTER signer_email",
                'signature_metadata' => "ADD COLUMN signature_metadata text DEFAULT NULL AFTER signature_position",
                'verification_code' => "ADD COLUMN verification_code varchar(100) DEFAULT NULL AFTER status",
                'verified_at' => "ADD COLUMN verified_at datetime DEFAULT NULL AFTER verification_code"
            ),
            'signature_fields' => array(
                'field_label' => "ADD COLUMN field_label varchar(255) DEFAULT NULL AFTER field_name",
                'field_properties' => "ADD COLUMN field_properties text DEFAULT NULL AFTER field_size",
                'page_number' => "ADD COLUMN page_number int(11) DEFAULT 1 AFTER field_order"
            )
        );
        
        foreach ($columns_to_add as $table => $columns) {
            $table_name = $this->tables[$table];
            
            foreach ($columns as $column => $sql) {
                // 檢查欄位是否已存在
                $column_exists = $wpdb->get_var(
                    $wpdb->prepare(
                        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                         WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                        DB_NAME,
                        $table_name,
                        $column
                    )
                );
                
                if (!$column_exists) {
                    $wpdb->query("ALTER TABLE $table_name $sql");
                }
            }
        }
    }
    
    /**
     * 遷移簽名數據
     */
    private function migrate_signature_data() {
        global $wpdb;
        
        // 更新舊的簽名位置數據格式
        $logs_table = $this->tables['signature_logs'];
        $old_logs = $wpdb->get_results(
            "SELECT id, signature_position FROM $logs_table 
             WHERE signature_position NOT LIKE '%page%'",
            ARRAY_A
        );
        
        foreach ($old_logs as $log) {
            $position = json_decode($log['signature_position'], true);
            if (is_array($position) && !isset($position['page'])) {
                $position['page'] = 1; // 默認第一頁
                $new_position = json_encode($position);
                
                $wpdb->update(
                    $logs_table,
                    array('signature_position' => $new_position),
                    array('id' => $log['id'])
                );
            }
        }
    }
    
    /**
     * 獲取文件統計
     */
    public function get_document_stats($document_id) {
        global $wpdb;
        
        $stats_table = $this->tables['document_stats'];
        $stats = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM $stats_table WHERE document_id = %d",
                $document_id
            ),
            ARRAY_A
        );
        
        if (!$stats) {
            // 創建新的統計記錄
            $wpdb->insert(
                $stats_table,
                array(
                    'document_id' => $document_id,
                    'views_count' => 0,
                    'signature_attempts' => 0,
                    'completed_signatures' => 0
                )
            );
            
            return array(
                'document_id' => $document_id,
                'views_count' => 0,
                'signature_attempts' => 0,
                'completed_signatures' => 0,
                'last_viewed' => null,
                'last_signed' => null,
                'average_completion_time' => null,
                'bounce_rate' => null
            );
        }
        
        return $stats;
    }
    
    /**
     * 更新文件統計
     */
    public function update_document_stats($document_id, $action, $data = array()) {
        global $wpdb;
        
        $stats_table = $this->tables['document_stats'];
        $current_stats = $this->get_document_stats($document_id);
        
        $updates = array();
        
        switch ($action) {
            case 'view':
                $updates['views_count'] = $current_stats['views_count'] + 1;
                $updates['last_viewed'] = current_time('mysql');
                break;
                
            case 'signature_attempt':
                $updates['signature_attempts'] = $current_stats['signature_attempts'] + 1;
                break;
                
            case 'signature_completed':
                $updates['completed_signatures'] = $current_stats['completed_signatures'] + 1;
                $updates['last_signed'] = current_time('mysql');
                
                // 計算平均完成時間
                if (isset($data['completion_time'])) {
                    $avg_time = $current_stats['average_completion_time'];
                    $count = $current_stats['completed_signatures'];
                    
                    if ($avg_time && $count > 0) {
                        $updates['average_completion_time'] = (($avg_time * $count) + $data['completion_time']) / ($count + 1);
                    } else {
                        $updates['average_completion_time'] = $data['completion_time'];
                    }
                }
                break;
        }
        
        // 計算跳出率
        if ($current_stats['views_count'] > 0) {
            $bounce_rate = (($current_stats['views_count'] - $current_stats['signature_attempts']) / $current_stats['views_count']) * 100;
            $updates['bounce_rate'] = round($bounce_rate, 2);
        }
        
        if (!empty($updates)) {
            $wpdb->update(
                $stats_table,
                $updates,
                array('document_id' => $document_id)
            );
        }
    }
    
    /**
     * 獲取簽名記錄
     */
    public function get_signature_logs($filters = array(), $limit = 50, $offset = 0) {
        global $wpdb;
        
        $logs_table = $this->tables['signature_logs'];
        $where_clauses = array('1=1');
        $values = array();
        
        if (!empty($filters['document_id'])) {
            $where_clauses[] = 'document_id = %d';
            $values[] = $filters['document_id'];
        }
        
        if (!empty($filters['status'])) {
            $where_clauses[] = 'status = %s';
            $values[] = $filters['status'];
        }
        
        if (!empty($filters['signer_email'])) {
            $where_clauses[] = 'signer_email = %s';
            $values[] = $filters['signer_email'];
        }
        
        if (!empty($filters['date_from'])) {
            $where_clauses[] = 'created_at >= %s';
            $values[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $where_clauses[] = 'created_at <= %s';
            $values[] = $filters['date_to'];
        }
        
        $where_sql = implode(' AND ', $where_clauses);
        $limit_sql = "LIMIT $limit OFFSET $offset";
        
        $sql = "SELECT * FROM $logs_table WHERE $where_sql ORDER BY created_at DESC $limit_sql";
        
        if (!empty($values)) {
            $sql = $wpdb->prepare($sql, $values);
        }
        
        return $wpdb->get_results($sql, ARRAY_A);
    }
    
    /**
     * 獲取簽名欄位
     */
    public function get_signature_fields($document_id, $page_number = null) {
        global $wpdb;
        
        $fields_table = $this->tables['signature_fields'];
        $where_clauses = array('document_id = %d');
        $values = array($document_id);
        
        if ($page_number !== null) {
            $where_clauses[] = 'page_number = %d';
            $values[] = $page_number;
        }
        
        $where_sql = implode(' AND ', $where_clauses);
        
        $sql = "SELECT * FROM $fields_table WHERE $where_sql ORDER BY field_order ASC";
        $sql = $wpdb->prepare($sql, $values);
        
        $fields = $wpdb->get_results($sql, ARRAY_A);
        
        // 解析JSON數據
        foreach ($fields as &$field) {
            $field['field_position'] = json_decode($field['field_position'], true);
            $field['field_size'] = json_decode($field['field_size'], true);
            $field['field_properties'] = json_decode($field['field_properties'], true);
        }
        
        return $fields;
    }
    
    /**
     * 清理過期數據
     */
    public function cleanup_expired_data($retention_days = 365) {
        global $wpdb;
        
        $cutoff_date = date('Y-m-d H:i:s', strtotime("-{$retention_days} days"));
        
        // 清理過期的安全日誌
        $security_table = $this->tables['security_log'];
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM $security_table WHERE timestamp < %s AND severity IN ('info', 'notice')",
                $cutoff_date
            )
        );
        
        // 清理過期的統計數據（保留基本統計）
        $stats_table = $this->tables['document_stats'];
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE $stats_table SET 
                 bounce_rate = NULL, 
                 average_completion_time = NULL 
                 WHERE updated_at < %s",
                $cutoff_date
            )
        );
    }
    
    /**
     * 優化資料庫表
     */
    public function optimize_tables() {
        global $wpdb;
        
        foreach ($this->tables as $table) {
            $wpdb->query("OPTIMIZE TABLE $table");
        }
    }
    
    /**
     * 獲取資料庫統計信息
     */
    public function get_database_stats() {
        global $wpdb;
        
        $stats = array();
        
        foreach ($this->tables as $name => $table) {
            $result = $wpdb->get_row(
                "SELECT 
                    COUNT(*) as row_count,
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
                 FROM information_schema.tables 
                 WHERE table_schema = '" . DB_NAME . "' 
                 AND table_name = '$table'"
            );
            
            $stats[$name] = array(
                'table_name' => $table,
                'row_count' => $result->row_count ?? 0,
                'size_mb' => $result->size_mb ?? 0
            );
        }
        
        return $stats;
    }
    
    /**
     * 備份表數據
     */
    public function backup_table_data($table_name, $backup_path) {
        global $wpdb;
        
        if (!in_array($table_name, $this->tables)) {
            return false;
        }
        
        $data = $wpdb->get_results("SELECT * FROM $table_name", ARRAY_A);
        $backup_data = array(
            'table' => $table_name,
            'version' => $this->version,
            'timestamp' => current_time('mysql'),
            'data' => $data
        );
        
        return file_put_contents($backup_path, json_encode($backup_data, JSON_PRETTY_PRINT));
    }
    
    /**
     * 恢復表數據
     */
    public function restore_table_data($backup_path) {
        if (!file_exists($backup_path)) {
            return false;
        }
        
        $backup_content = file_get_contents($backup_path);
        $backup_data = json_decode($backup_content, true);
        
        if (!$backup_data || !isset($backup_data['table'], $backup_data['data'])) {
            return false;
        }
        
        global $wpdb;
        $table_name = $backup_data['table'];
        
        // 清空現有數據
        $wpdb->query("TRUNCATE TABLE $table_name");
        
        // 插入備份數據
        foreach ($backup_data['data'] as $row) {
            $wpdb->insert($table_name, $row);
        }
        
        return true;
    }
}