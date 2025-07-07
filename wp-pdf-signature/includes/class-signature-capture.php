<?php
/**
 * 簽名捕獲類
 */

if (!defined('ABSPATH')) {
    exit;
}

class WP_PDF_Signature_Capture {
    
    public function __construct() {
        add_action('wp_ajax_save_signature_field', array($this, 'save_signature_field'));
        add_action('wp_ajax_nopriv_save_signature_field', array($this, 'save_signature_field'));
        add_action('wp_ajax_submit_signature', array($this, 'submit_signature'));
        add_action('wp_ajax_nopriv_submit_signature', array($this, 'submit_signature'));
        add_action('wp_ajax_get_signature_fields', array($this, 'get_signature_fields'));
        add_action('wp_ajax_nopriv_get_signature_fields', array($this, 'get_signature_fields'));
    }
    
    /**
     * 保存簽名欄位設定
     */
    public function save_signature_field() {
        // 檢查nonce
        if (!wp_verify_nonce($_POST['nonce'], 'signature_field_nonce')) {
            wp_die('Security check failed');
        }
        
        // 檢查權限
        if (!current_user_can('edit_posts')) {
            wp_send_json_error('無權限執行此操作');
        }
        
        global $wpdb;
        
        $document_id = intval($_POST['document_id']);
        $field_type = sanitize_text_field($_POST['field_type']);
        $field_name = sanitize_text_field($_POST['field_name']);
        $field_position = json_decode(stripslashes($_POST['field_position']), true);
        $field_size = json_decode(stripslashes($_POST['field_size']), true);
        $field_required = isset($_POST['field_required']) ? 1 : 0;
        $field_order = intval($_POST['field_order']);
        
        // 驗證數據
        if (!$document_id || !$field_type || !$field_name) {
            wp_send_json_error('必填欄位不能為空');
        }
        
        // 驗證位置和大小數據
        if (!is_array($field_position) || !isset($field_position['x']) || !isset($field_position['y'])) {
            wp_send_json_error('欄位位置數據無效');
        }
        
        if (!is_array($field_size) || !isset($field_size['width']) || !isset($field_size['height'])) {
            wp_send_json_error('欄位大小數據無效');
        }
        
        // 保存到資料庫
        $table_name = $wpdb->prefix . 'pdf_signature_fields';
        $result = $wpdb->insert(
            $table_name,
            array(
                'document_id' => $document_id,
                'field_type' => $field_type,
                'field_name' => $field_name,
                'field_position' => json_encode($field_position),
                'field_size' => json_encode($field_size),
                'field_required' => $field_required,
                'field_order' => $field_order,
                'created_at' => current_time('mysql')
            ),
            array('%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s')
        );
        
        if ($result) {
            wp_send_json_success(array(
                'field_id' => $wpdb->insert_id,
                'message' => '簽名欄位保存成功'
            ));
        } else {
            wp_send_json_error('保存簽名欄位失敗');
        }
    }
    
    /**
     * 獲取簽名欄位
     */
    public function get_signature_fields() {
        $document_id = intval($_GET['document_id']);
        
        if (!$document_id) {
            wp_send_json_error('文件ID無效');
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'pdf_signature_fields';
        
        $fields = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM $table_name WHERE document_id = %d ORDER BY field_order ASC",
                $document_id
            ),
            ARRAY_A
        );
        
        // 解析JSON數據
        foreach ($fields as &$field) {
            $field['field_position'] = json_decode($field['field_position'], true);
            $field['field_size'] = json_decode($field['field_size'], true);
        }
        
        wp_send_json_success($fields);
    }
    
    /**
     * 提交簽名
     */
    public function submit_signature() {
        // 檢查nonce
        if (!wp_verify_nonce($_POST['nonce'], 'submit_signature_nonce')) {
            wp_die('Security check failed');
        }
        
        $document_id = intval($_POST['document_id']);
        $signature_data = $_POST['signature_data']; // Base64編碼的簽名圖片
        $signer_name = sanitize_text_field($_POST['signer_name']);
        $signer_email = sanitize_email($_POST['signer_email']);
        $signature_position = json_decode(stripslashes($_POST['signature_position']), true);
        
        // 驗證必填欄位
        if (!$document_id || !$signature_data || !$signer_name || !$signer_email) {
            wp_send_json_error('請填寫所有必填欄位');
        }
        
        // 驗證email格式
        if (!is_email($signer_email)) {
            wp_send_json_error('請輸入有效的電子郵件地址');
        }
        
        // 驗證簽名數據
        if (!$this->validate_signature_data($signature_data)) {
            wp_send_json_error('簽名數據無效');
        }
        
        // 生成簽名哈希
        $signature_hash = hash('sha256', $signature_data . $signer_email . current_time('mysql'));
        
        // 獲取用戶資訊
        $user_ip = $this->get_user_ip();
        $user_agent = sanitize_text_field($_SERVER['HTTP_USER_AGENT']);
        $user_id = get_current_user_id();
        
        // 保存簽名記錄
        global $wpdb;
        $table_name = $wpdb->prefix . 'pdf_signature_logs';
        
        $result = $wpdb->insert(
            $table_name,
            array(
                'document_id' => $document_id,
                'user_id' => $user_id ?: null,
                'signature_data' => $signature_data,
                'signature_hash' => $signature_hash,
                'signer_name' => $signer_name,
                'signer_email' => $signer_email,
                'signer_ip' => $user_ip,
                'user_agent' => $user_agent,
                'signature_position' => json_encode($signature_position),
                'status' => 'signed',
                'created_at' => current_time('mysql')
            ),
            array('%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
        );
        
        if ($result) {
            // 更新文件狀態
            update_post_meta($document_id, '_pdf_signature_status', 'signed');
            update_post_meta($document_id, '_pdf_signature_date', current_time('mysql'));
            update_post_meta($document_id, '_pdf_signer_name', $signer_name);
            update_post_meta($document_id, '_pdf_signer_email', $signer_email);
            
            // 生成已簽名的PDF
            $pdf_handler = new WP_PDF_Signature_PDF_Handler();
            $signed_pdf_path = $pdf_handler->merge_signature_to_pdf($document_id, $signature_data);
            
            if ($signed_pdf_path) {
                update_post_meta($document_id, '_pdf_signed_file_path', $signed_pdf_path);
            }
            
            // 發送電子郵件通知
            $this->send_signature_notification($document_id, $signer_name, $signer_email);
            
            wp_send_json_success(array(
                'signature_id' => $wpdb->insert_id,
                'message' => '簽名提交成功',
                'download_url' => $this->get_download_url($document_id, $signature_hash)
            ));
        } else {
            wp_send_json_error('簽名提交失敗，請重試');
        }
    }
    
    /**
     * 驗證簽名數據
     */
    private function validate_signature_data($signature_data) {
        // 檢查base64格式
        if (!preg_match('/^data:image\/png;base64,/', $signature_data)) {
            return false;
        }
        
        // 提取base64數據
        $base64_data = str_replace('data:image/png;base64,', '', $signature_data);
        $decoded_data = base64_decode($base64_data);
        
        // 檢查是否為有效的PNG圖片
        if (!$decoded_data || !imagecreatefromstring($decoded_data)) {
            return false;
        }
        
        // 檢查圖片尺寸（避免過大的簽名）
        $image_info = getimagesizefromstring($decoded_data);
        if (!$image_info || $image_info[0] > 800 || $image_info[1] > 400) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 獲取用戶IP地址
     */
    private function get_user_ip() {
        $ip_fields = array(
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR'
        );
        
        foreach ($ip_fields as $field) {
            if (!empty($_SERVER[$field])) {
                $ip = $_SERVER[$field];
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
    
    /**
     * 發送簽名通知郵件
     */
    private function send_signature_notification($document_id, $signer_name, $signer_email) {
        $document_title = get_the_title($document_id);
        $site_name = get_bloginfo('name');
        
        // 發送給簽名者的確認郵件
        $subject = sprintf('[%s] 簽名確認 - %s', $site_name, $document_title);
        $message = sprintf(
            "親愛的 %s，\n\n" .
            "您已成功簽署文件「%s」。\n\n" .
            "簽名時間：%s\n" .
            "文件連結：%s\n\n" .
            "感謝您的配合。\n\n" .
            "此郵件由系統自動發送，請勿回復。",
            $signer_name,
            $document_title,
            current_time('Y-m-d H:i:s'),
            get_permalink($document_id)
        );
        
        wp_mail($signer_email, $subject, $message);
        
        // 發送給管理員的通知郵件
        $admin_email = get_option('admin_email');
        $admin_subject = sprintf('[%s] 新簽名通知 - %s', $site_name, $document_title);
        $admin_message = sprintf(
            "有新的文件簽名：\n\n" .
            "文件：%s\n" .
            "簽名者：%s (%s)\n" .
            "簽名時間：%s\n" .
            "管理連結：%s\n\n" .
            "請登入後台查看詳細資訊。",
            $document_title,
            $signer_name,
            $signer_email,
            current_time('Y-m-d H:i:s'),
            admin_url('post.php?post=' . $document_id . '&action=edit')
        );
        
        wp_mail($admin_email, $admin_subject, $admin_message);
    }
    
    /**
     * 獲取下載連結
     */
    private function get_download_url($document_id, $signature_hash) {
        return add_query_arg(array(
            'action' => 'download_signed_pdf',
            'document_id' => $document_id,
            'signature_hash' => $signature_hash,
            'nonce' => wp_create_nonce('download_pdf_nonce')
        ), admin_url('admin-ajax.php'));
    }
    
    /**
     * 獲取簽名統計
     */
    public function get_signature_statistics($document_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'pdf_signature_logs';
        
        $stats = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT 
                    COUNT(*) as total_signatures,
                    COUNT(CASE WHEN status = 'signed' THEN 1 END) as completed_signatures,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_signatures,
                    MIN(created_at) as first_signature_date,
                    MAX(created_at) as last_signature_date
                FROM $table_name 
                WHERE document_id = %d",
                $document_id
            ),
            ARRAY_A
        );
        
        return $stats;
    }
}