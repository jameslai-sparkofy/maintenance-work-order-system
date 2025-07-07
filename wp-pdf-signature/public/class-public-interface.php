<?php
/**
 * 前台介面類
 */

if (!defined('ABSPATH')) {
    exit;
}

class WP_PDF_Signature_Public {
    
    public function __construct() {
        add_action('init', array($this, 'add_rewrite_rules'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_public_scripts'));
        add_action('template_redirect', array($this, 'handle_signature_page'));
        add_action('wp_ajax_download_signed_pdf', array($this, 'download_signed_pdf'));
        add_action('wp_ajax_nopriv_download_signed_pdf', array($this, 'download_signed_pdf'));
    }
    
    /**
     * 添加重寫規則
     */
    public function add_rewrite_rules() {
        add_rewrite_rule(
            '^pdf-signature/([^/]+)/?$',
            'index.php?pdf_signature_id=$matches[1]',
            'top'
        );
        
        add_rewrite_tag('%pdf_signature_id%', '([^&]+)');
    }
    
    /**
     * 載入前台腳本和樣式
     */
    public function enqueue_public_scripts() {
        if (get_query_var('pdf_signature_id')) {
            // 載入兼容性修復腳本（早期版本已經載入，這是額外的修復）
            wp_enqueue_script('wp-pdf-signature-compatibility', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/compatibility.js', array('jquery', 'wp-pdf-signature-early-compatibility'), WP_PDF_SIGNATURE_VERSION, false);
            
            wp_enqueue_script('wp-pdf-signature-public', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/public.js', array('jquery', 'wp-pdf-signature-early-compatibility', 'wp-pdf-signature-compatibility'), WP_PDF_SIGNATURE_VERSION, true);
            wp_enqueue_style('wp-pdf-signature-public', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/css/public.css', array(), WP_PDF_SIGNATURE_VERSION);
            
            // PDF相關庫
            wp_enqueue_script('pdf-lib', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/pdf-lib.min.js', array(), '1.17.1', true);
            wp_enqueue_script('signature-pad', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/signature-pad.min.js', array(), '4.1.7', true);
            wp_enqueue_script('pdf-js', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/pdf.min.js', array(), '4.0.269', true);
            wp_enqueue_script('pdf-js-worker', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/pdf.worker.min.js', array(), '4.0.269', true);
            
            // 本地化腳本
            wp_localize_script('wp-pdf-signature-public', 'wpPdfSignaturePublic', array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'submitNonce' => wp_create_nonce('submit_signature_nonce'),
                'signatureColor' => get_option('wp_pdf_signature_signature_color', '#000000'),
                'signatureWidth' => get_option('wp_pdf_signature_signature_width', 3),
                'strings' => array(
                    'signatureRequired' => __('請提供您的簽名', 'wp-pdf-signature'),
                    'nameRequired' => __('請輸入您的姓名', 'wp-pdf-signature'),
                    'emailRequired' => __('請輸入您的電子郵件', 'wp-pdf-signature'),
                    'emailInvalid' => __('請輸入有效的電子郵件地址', 'wp-pdf-signature'),
                    'submitting' => __('提交中...', 'wp-pdf-signature'),
                    'submitSuccess' => __('簽名提交成功！', 'wp-pdf-signature'),
                    'submitError' => __('提交失敗，請重試', 'wp-pdf-signature'),
                    'clearSignature' => __('清除簽名', 'wp-pdf-signature'),
                    'submitSignature' => __('提交簽名', 'wp-pdf-signature'),
                    'downloadPdf' => __('下載已簽名PDF', 'wp-pdf-signature'),
                    'loading' => __('載入中...', 'wp-pdf-signature'),
                    'documentNotFound' => __('找不到指定的文件', 'wp-pdf-signature'),
                    'alreadySigned' => __('此文件已被簽名', 'wp-pdf-signature')
                )
            ));
        }
    }
    
    /**
     * 處理簽名頁面
     */
    public function handle_signature_page() {
        $signature_id = get_query_var('pdf_signature_id');
        
        if ($signature_id) {
            $this->display_signature_page($signature_id);
            exit;
        }
    }
    
    /**
     * 顯示簽名頁面
     */
    private function display_signature_page($unique_id) {
        // 查找文件
        $document = $this->get_document_by_unique_id($unique_id);
        
        if (!$document) {
            wp_die('找不到指定的文件', 'PDF簽名系統');
        }
        
        // 檢查文件狀態
        $status = get_post_meta($document->ID, '_pdf_signature_status', true);
        
        // 獲取簽名欄位
        $signature_fields = $this->get_document_signature_fields($document->ID);
        
        ?>
        <!DOCTYPE html>
        <html <?php language_attributes(); ?>>
        <head>
            <meta charset="<?php bloginfo('charset'); ?>">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title><?php echo esc_html($document->post_title); ?> - PDF簽名系統</title>
            <?php wp_head(); ?>
        </head>
        <body class="pdf-signature-page">
            <div class="pdf-signature-container">
                <header class="pdf-signature-header">
                    <h1><?php echo esc_html($document->post_title); ?></h1>
                    <?php if ($document->post_content): ?>
                        <div class="document-description">
                            <?php echo wp_kses_post($document->post_content); ?>
                        </div>
                    <?php endif; ?>
                </header>
                
                <main class="pdf-signature-main">
                    <?php if ($status === 'signed'): ?>
                        <div class="signature-complete">
                            <h2>文件已簽名</h2>
                            <p>此文件已於 <?php echo get_post_meta($document->ID, '_pdf_signature_date', true); ?> 完成簽名。</p>
                            <p>簽名者：<?php echo esc_html(get_post_meta($document->ID, '_pdf_signer_name', true)); ?></p>
                            
                            <div class="download-section">
                                <a href="<?php echo $this->get_download_url($document->ID); ?>" class="button download-button">
                                    下載已簽名的PDF
                                </a>
                            </div>
                        </div>
                    <?php else: ?>
                        <div class="pdf-viewer-container">
                            <div class="pdf-viewer">
                                <canvas id="pdf-canvas"></canvas>
                                <div id="signature-fields-overlay" class="signature-fields-overlay"></div>
                            </div>
                            
                            <div class="pdf-controls">
                                <button id="prev-page" class="button" disabled>上一頁</button>
                                <span id="page-info">頁面 <span id="page-num">1</span> / <span id="page-count">1</span></span>
                                <button id="next-page" class="button" disabled>下一頁</button>
                            </div>
                        </div>
                        
                        <div class="signature-form-container">
                            <h2>請在此簽名</h2>
                            
                            <form id="signature-form" class="signature-form">
                                <div class="form-group">
                                    <label for="signer-name">姓名 <span class="required">*</span></label>
                                    <input type="text" id="signer-name" name="signer_name" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="signer-email">電子郵件 <span class="required">*</span></label>
                                    <input type="email" id="signer-email" name="signer_email" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="signature-pad">簽名 <span class="required">*</span></label>
                                    <div class="signature-pad-container">
                                        <canvas id="signature-pad" class="signature-pad"></canvas>
                                        <div class="signature-pad-controls">
                                            <button type="button" id="clear-signature" class="button">清除簽名</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="agree-terms" required>
                                        我同意以上簽名具有法律效力，等同於親筆簽名
                                    </label>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" id="submit-signature" class="button submit-button">
                                        提交簽名
                                    </button>
                                </div>
                            </form>
                        </div>
                    <?php endif; ?>
                </main>
                
                <footer class="pdf-signature-footer">
                    <p>由 <?php bloginfo('name'); ?> 提供的PDF簽名系統</p>
                </footer>
            </div>
            
            <script>
                var pdfSignatureData = {
                    documentId: <?php echo $document->ID; ?>,
                    uniqueId: '<?php echo esc_js($unique_id); ?>',
                    signatureFields: <?php echo json_encode($signature_fields); ?>,
                    pdfUrl: '<?php echo $this->get_pdf_url($document->ID); ?>',
                    status: '<?php echo esc_js($status); ?>'
                };
            </script>
            
            <?php wp_footer(); ?>
        </body>
        </html>
        <?php
    }
    
    /**
     * 根據唯一ID獲取文件
     */
    private function get_document_by_unique_id($unique_id) {
        $documents = get_posts(array(
            'post_type' => 'pdf_signature_doc',
            'post_status' => 'any',
            'numberposts' => 1,
            'meta_query' => array(
                array(
                    'key' => '_pdf_unique_id',
                    'value' => $unique_id,
                    'compare' => '='
                )
            )
        ));
        
        return $documents ? $documents[0] : null;
    }
    
    /**
     * 獲取文件的簽名欄位
     */
    private function get_document_signature_fields($document_id) {
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
        
        return $fields;
    }
    
    /**
     * 獲取PDF URL
     */
    private function get_pdf_url($document_id) {
        $unique_id = get_post_meta($document_id, '_pdf_unique_id', true);
        
        return add_query_arg(array(
            'action' => 'get_pdf_content',
            'document_id' => $document_id,
            'unique_id' => $unique_id,
            'nonce' => wp_create_nonce('get_pdf_content')
        ), admin_url('admin-ajax.php'));
    }
    
    /**
     * 獲取下載URL
     */
    private function get_download_url($document_id) {
        $unique_id = get_post_meta($document_id, '_pdf_unique_id', true);
        
        return add_query_arg(array(
            'action' => 'download_signed_pdf',
            'document_id' => $document_id,
            'unique_id' => $unique_id,
            'nonce' => wp_create_nonce('download_pdf_nonce')
        ), admin_url('admin-ajax.php'));
    }
    
    /**
     * 下載已簽名的PDF
     */
    public function download_signed_pdf() {
        // 檢查nonce
        if (!wp_verify_nonce($_GET['nonce'], 'download_pdf_nonce')) {
            wp_die('Security check failed');
        }
        
        $document_id = intval($_GET['document_id']);
        $unique_id = sanitize_text_field($_GET['unique_id']);
        
        // 驗證文件存在
        $document = $this->get_document_by_unique_id($unique_id);
        if (!$document || $document->ID !== $document_id) {
            wp_die('文件不存在');
        }
        
        // 檢查文件狀態
        $status = get_post_meta($document_id, '_pdf_signature_status', true);
        if ($status !== 'signed') {
            wp_die('文件尚未簽名');
        }
        
        // 獲取已簽名的文件路徑
        $signed_file_path = get_post_meta($document_id, '_pdf_signed_file_path', true);
        if (!$signed_file_path || !file_exists($signed_file_path)) {
            // 如果沒有已簽名的文件，使用原始文件
            $signed_file_path = get_post_meta($document_id, '_pdf_file_path', true);
        }
        
        if (!file_exists($signed_file_path)) {
            wp_die('文件不存在');
        }
        
        // 設置下載標頭
        $file_name = $document->post_title . '_已簽名.pdf';
        $file_name = sanitize_file_name($file_name);
        
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $file_name . '"');
        header('Content-Length: ' . filesize($signed_file_path));
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');
        
        // 輸出文件內容
        readfile($signed_file_path);
        exit;
    }
    
    /**
     * 獲取PDF內容（用於前端顯示）
     */
    public function get_pdf_content() {
        // 檢查nonce
        if (!wp_verify_nonce($_GET['nonce'], 'get_pdf_content')) {
            wp_die('Security check failed');
        }
        
        $document_id = intval($_GET['document_id']);
        $unique_id = sanitize_text_field($_GET['unique_id']);
        
        // 驗證文件存在
        $document = $this->get_document_by_unique_id($unique_id);
        if (!$document || $document->ID !== $document_id) {
            wp_die('文件不存在');
        }
        
        $file_path = get_post_meta($document_id, '_pdf_file_path', true);
        if (!file_exists($file_path)) {
            wp_die('文件不存在');
        }
        
        // 設置PDF標頭
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . basename($file_path) . '"');
        header('Content-Length: ' . filesize($file_path));
        
        // 輸出文件內容
        readfile($file_path);
        exit;
    }
    
    /**
     * 驗證簽名頁面訪問權限
     */
    private function validate_signature_access($document_id, $unique_id) {
        // 檢查文件是否存在
        $document = $this->get_document_by_unique_id($unique_id);
        if (!$document || $document->ID !== $document_id) {
            return false;
        }
        
        // 檢查文件狀態
        $status = get_post_meta($document_id, '_pdf_signature_status', true);
        if ($status === 'expired') {
            return false;
        }
        
        // 檢查文件是否過期
        $upload_date = get_post_meta($document_id, '_pdf_upload_date', true);
        $expiry_days = get_option('wp_pdf_signature_file_expiry_days', 30);
        
        if ($upload_date) {
            $expiry_date = strtotime($upload_date . ' + ' . $expiry_days . ' days');
            if (time() > $expiry_date) {
                update_post_meta($document_id, '_pdf_signature_status', 'expired');
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 記錄簽名頁面訪問
     */
    private function log_signature_access($document_id) {
        $access_log = get_post_meta($document_id, '_pdf_access_log', true);
        if (!$access_log) {
            $access_log = array();
        }
        
        $access_log[] = array(
            'timestamp' => current_time('mysql'),
            'ip' => $_SERVER['REMOTE_ADDR'],
            'user_agent' => $_SERVER['HTTP_USER_AGENT']
        );
        
        // 只保留最近的10次訪問記錄
        if (count($access_log) > 10) {
            $access_log = array_slice($access_log, -10);
        }
        
        update_post_meta($document_id, '_pdf_access_log', $access_log);
    }
}