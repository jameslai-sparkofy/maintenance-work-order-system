<?php
/**
 * PDF處理類
 */

if (!defined('ABSPATH')) {
    exit;
}

class WP_PDF_Signature_PDF_Handler {
    
    private $upload_dir;
    
    public function __construct() {
        $this->upload_dir = wp_pdf_signature_get_upload_dir();
        add_action('wp_ajax_upload_pdf', array($this, 'handle_pdf_upload'));
        add_action('wp_ajax_nopriv_upload_pdf', array($this, 'handle_pdf_upload'));
    }
    
    /**
     * 處理PDF上傳
     */
    public function handle_pdf_upload() {
        // 檢查nonce
        if (!wp_verify_nonce($_POST['nonce'], 'pdf_upload_nonce')) {
            wp_die('Security check failed');
        }
        
        // 檢查文件上傳
        if (!isset($_FILES['pdf_file']) || $_FILES['pdf_file']['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error('PDF文件上傳失敗');
        }
        
        $file = $_FILES['pdf_file'];
        
        // 驗證文件類型
        if (!$this->validate_pdf_file($file)) {
            wp_send_json_error('請上傳有效的PDF文件');
        }
        
        // 驗證文件大小
        if (!$this->validate_file_size($file)) {
            wp_send_json_error('文件大小超過限制');
        }
        
        // 生成唯一文件名
        $unique_id = wp_pdf_signature_generate_unique_id();
        $file_name = $unique_id . '.pdf';
        $file_path = $this->upload_dir . $file_name;
        
        // 移動文件
        if (move_uploaded_file($file['tmp_name'], $file_path)) {
            // 創建文件記錄
            $post_id = wp_insert_post(array(
                'post_title' => sanitize_text_field($_POST['document_title']) ?: 'PDF簽名文件',
                'post_content' => sanitize_textarea_field($_POST['document_description']),
                'post_status' => 'draft',
                'post_type' => 'pdf_signature_doc'
            ));
            
            if ($post_id) {
                // 保存文件元數據
                update_post_meta($post_id, '_pdf_file_path', $file_path);
                update_post_meta($post_id, '_pdf_file_name', $file_name);
                update_post_meta($post_id, '_pdf_file_url', wp_upload_dir()['baseurl'] . '/pdf-signatures/' . $file_name);
                update_post_meta($post_id, '_pdf_unique_id', $unique_id);
                update_post_meta($post_id, '_pdf_original_name', $file['name']);
                update_post_meta($post_id, '_pdf_file_size', $file['size']);
                update_post_meta($post_id, '_pdf_upload_date', current_time('mysql'));
                update_post_meta($post_id, '_pdf_signature_status', 'pending');
                
                // 生成PDF資訊
                $pdf_info = $this->get_pdf_info($file_path);
                update_post_meta($post_id, '_pdf_page_count', $pdf_info['page_count']);
                update_post_meta($post_id, '_pdf_dimensions', $pdf_info['dimensions']);
                
                wp_send_json_success(array(
                    'document_id' => $post_id,
                    'unique_id' => $unique_id,
                    'file_name' => $file_name,
                    'page_count' => $pdf_info['page_count'],
                    'dimensions' => $pdf_info['dimensions'],
                    'message' => 'PDF上傳成功'
                ));
            } else {
                unlink($file_path);
                wp_send_json_error('創建文件記錄失敗');
            }
        } else {
            wp_send_json_error('文件保存失敗');
        }
    }
    
    /**
     * 驗證PDF文件
     */
    private function validate_pdf_file($file) {
        // 檢查文件擴展名
        $file_ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($file_ext !== 'pdf') {
            return false;
        }
        
        // 檢查MIME類型
        $allowed_mimes = array('application/pdf');
        if (!in_array($file['type'], $allowed_mimes)) {
            return false;
        }
        
        // 檢查文件頭部
        $handle = fopen($file['tmp_name'], 'rb');
        $header = fread($handle, 4);
        fclose($handle);
        
        return ($header === '%PDF');
    }
    
    /**
     * 驗證文件大小
     */
    private function validate_file_size($file) {
        $max_size = get_option('wp_pdf_signature_upload_max_size', 10) * 1024 * 1024; // 轉換為字節
        return $file['size'] <= $max_size;
    }
    
    /**
     * 獲取PDF資訊
     */
    private function get_pdf_info($file_path) {
        $info = array(
            'page_count' => 1,
            'dimensions' => array('width' => 595, 'height' => 842) // A4預設尺寸
        );
        
        // 嘗試使用PDF解析庫（如果可用）
        if (class_exists('Imagick')) {
            try {
                $imagick = new Imagick();
                $imagick->setResolution(150, 150);
                $imagick->readImage($file_path);
                
                $info['page_count'] = $imagick->getNumberImages();
                
                $imagick->setIteratorIndex(0);
                $geometry = $imagick->getImageGeometry();
                $info['dimensions'] = array(
                    'width' => $geometry['width'],
                    'height' => $geometry['height']
                );
                
                $imagick->destroy();
            } catch (Exception $e) {
                error_log('PDF info extraction failed: ' . $e->getMessage());
            }
        }
        
        return $info;
    }
    
    /**
     * 生成PDF預覽圖
     */
    public function generate_pdf_preview($file_path, $page = 1) {
        if (!class_exists('Imagick')) {
            return false;
        }
        
        try {
            $imagick = new Imagick();
            $imagick->setResolution(150, 150);
            $imagick->readImage($file_path . '[' . ($page - 1) . ']');
            $imagick->setImageFormat('png');
            $imagick->setImageBackgroundColor('#ffffff');
            $imagick->setImageAlphaChannel(Imagick::ALPHACHANNEL_REMOVE);
            
            $preview_name = pathinfo($file_path, PATHINFO_FILENAME) . '_page_' . $page . '.png';
            $preview_path = $this->upload_dir . 'previews/' . $preview_name;
            
            // 創建預覽目錄
            if (!file_exists(dirname($preview_path))) {
                wp_mkdir_p(dirname($preview_path));
            }
            
            $imagick->writeImage($preview_path);
            $imagick->destroy();
            
            return $preview_path;
        } catch (Exception $e) {
            error_log('PDF preview generation failed: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 獲取PDF文件內容（用於前端顯示）
     */
    public function get_pdf_for_display($document_id) {
        $file_path = get_post_meta($document_id, '_pdf_file_path', true);
        
        if (!file_exists($file_path)) {
            return false;
        }
        
        // 返回base64編碼的PDF內容
        $pdf_content = file_get_contents($file_path);
        return base64_encode($pdf_content);
    }
    
    /**
     * 合併簽名到PDF
     */
    public function merge_signature_to_pdf($document_id, $signature_data) {
        $file_path = get_post_meta($document_id, '_pdf_file_path', true);
        
        if (!file_exists($file_path)) {
            return false;
        }
        
        // 創建已簽名文件的副本
        $unique_id = get_post_meta($document_id, '_pdf_unique_id', true);
        $signed_file_name = $unique_id . '_signed.pdf';
        $signed_file_path = $this->upload_dir . $signed_file_name;
        
        // 複製原始文件
        copy($file_path, $signed_file_path);
        
        // 這裡應該實現實際的PDF簽名合併邏輯
        // 可以使用第三方庫如TCPDF、FPDF等
        
        // 暫時返回複製的文件路徑
        return $signed_file_path;
    }
    
    /**
     * 清理過期文件
     */
    public function cleanup_expired_files() {
        $expiry_days = get_option('wp_pdf_signature_file_expiry_days', 30);
        $expiry_time = time() - ($expiry_days * 24 * 60 * 60);
        
        $expired_posts = get_posts(array(
            'post_type' => 'pdf_signature_doc',
            'post_status' => 'any',
            'numberposts' => -1,
            'date_query' => array(
                array(
                    'before' => date('Y-m-d H:i:s', $expiry_time),
                )
            )
        ));
        
        foreach ($expired_posts as $post) {
            $file_path = get_post_meta($post->ID, '_pdf_file_path', true);
            if (file_exists($file_path)) {
                unlink($file_path);
            }
            
            wp_delete_post($post->ID, true);
        }
    }
}