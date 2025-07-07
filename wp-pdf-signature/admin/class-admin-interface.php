<?php
/**
 * 管理員介面類
 */

if (!defined('ABSPATH')) {
    exit;
}

class WP_PDF_Signature_Admin {
    
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post', array($this, 'save_meta_boxes'));
        add_filter('manage_pdf_signature_doc_posts_columns', array($this, 'add_custom_columns'));
        add_action('manage_pdf_signature_doc_posts_custom_column', array($this, 'custom_column_content'), 10, 2);
    }
    
    /**
     * 添加管理員選單
     */
    public function add_admin_menu() {
        add_menu_page(
            'PDF簽名系統',
            'PDF簽名',
            'manage_options',
            'wp-pdf-signature',
            array($this, 'admin_page'),
            'dashicons-media-document',
            30
        );
        
        add_submenu_page(
            'wp-pdf-signature',
            '新增簽名文件',
            '新增文件',
            'edit_posts',
            'wp-pdf-signature-new',
            array($this, 'new_document_page')
        );
        
        add_submenu_page(
            'wp-pdf-signature',
            '簽名記錄',
            '簽名記錄',
            'manage_options',
            'wp-pdf-signature-logs',
            array($this, 'signature_logs_page')
        );
        
        add_submenu_page(
            'wp-pdf-signature',
            '系統設定',
            '設定',
            'manage_options',
            'wp-pdf-signature-settings',
            array($this, 'settings_page')
        );
    }
    
    /**
     * 載入管理員腳本和樣式
     */
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'wp-pdf-signature') === false && get_post_type() !== 'pdf_signature_doc') {
            return;
        }
        
        // 載入兼容性修復腳本（早期版本已經載入，這是額外的修復）
        wp_enqueue_script('wp-pdf-signature-compatibility', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/compatibility.js', array('jquery', 'wp-pdf-signature-early-compatibility'), WP_PDF_SIGNATURE_VERSION, false);
        
        wp_enqueue_script('wp-pdf-signature-admin', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/admin.js', array('jquery', 'wp-pdf-signature-early-compatibility', 'wp-pdf-signature-compatibility'), WP_PDF_SIGNATURE_VERSION, true);
        wp_enqueue_style('wp-pdf-signature-admin', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/css/admin.css', array(), WP_PDF_SIGNATURE_VERSION);
        
        // PDF相關庫
        wp_enqueue_script('pdf-lib', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/pdf-lib.min.js', array(), '1.17.1', true);
        wp_enqueue_script('signature-pad', WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/signature-pad.min.js', array(), '4.1.7', true);
        
        // 本地化腳本
        wp_localize_script('wp-pdf-signature-admin', 'wpPdfSignature', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wp_pdf_signature_nonce'),
            'uploadNonce' => wp_create_nonce('pdf_upload_nonce'),
            'fieldNonce' => wp_create_nonce('signature_field_nonce'),
            'strings' => array(
                'uploadSuccess' => __('上傳成功', 'wp-pdf-signature'),
                'uploadError' => __('上傳失敗', 'wp-pdf-signature'),
                'invalidFile' => __('無效的PDF文件', 'wp-pdf-signature'),
                'fileTooLarge' => __('文件過大', 'wp-pdf-signature'),
                'deleteConfirm' => __('確定要刪除嗎？', 'wp-pdf-signature'),
                'fieldRequired' => __('此欄位為必填', 'wp-pdf-signature'),
                'addSignatureField' => __('添加簽名欄位', 'wp-pdf-signature'),
                'addTextField' => __('添加文字欄位', 'wp-pdf-signature'),
                'addDateField' => __('添加日期欄位', 'wp-pdf-signature'),
                'saveFields' => __('保存欄位', 'wp-pdf-signature'),
                'previewDocument' => __('預覽文件', 'wp-pdf-signature'),
                'generateLink' => __('生成分享連結', 'wp-pdf-signature')
            )
        ));
    }
    
    /**
     * 主要管理頁面
     */
    public function admin_page() {
        $documents = get_posts(array(
            'post_type' => 'pdf_signature_doc',
            'post_status' => 'any',
            'numberposts' => 20,
            'orderby' => 'date',
            'order' => 'DESC'
        ));
        
        ?>
        <div class="wrap">
            <h1>PDF簽名系統</h1>
            
            <div class="notice notice-info">
                <p>歡迎使用PDF簽名系統！您可以上傳PDF文件，設定簽名欄位，並生成分享連結供他人簽名。</p>
            </div>
            
            <div class="wp-pdf-signature-dashboard">
                <div class="dashboard-stats">
                    <div class="stat-box">
                        <h3><?php echo $this->get_total_documents(); ?></h3>
                        <p>總文件數</p>
                    </div>
                    <div class="stat-box">
                        <h3><?php echo $this->get_signed_documents(); ?></h3>
                        <p>已簽名文件</p>
                    </div>
                    <div class="stat-box">
                        <h3><?php echo $this->get_pending_documents(); ?></h3>
                        <p>待簽名文件</p>
                    </div>
                </div>
                
                <div class="recent-documents">
                    <h2>最近的文件</h2>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>文件名稱</th>
                                <th>狀態</th>
                                <th>創建時間</th>
                                <th>簽名者</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if ($documents): ?>
                                <?php foreach ($documents as $doc): ?>
                                    <tr>
                                        <td>
                                            <strong><?php echo esc_html($doc->post_title); ?></strong>
                                            <div class="row-actions">
                                                <span class="edit">
                                                    <a href="<?php echo get_edit_post_link($doc->ID); ?>">編輯</a>
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <?php echo $this->get_document_status_badge($doc->ID); ?>
                                        </td>
                                        <td><?php echo get_the_date('Y-m-d H:i', $doc->ID); ?></td>
                                        <td><?php echo esc_html(get_post_meta($doc->ID, '_pdf_signer_name', true)); ?></td>
                                        <td>
                                            <a href="<?php echo $this->get_document_share_url($doc->ID); ?>" target="_blank" class="button button-small">分享連結</a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="5">尚無文件</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * 新增文件頁面
     */
    public function new_document_page() {
        ?>
        <div class="wrap">
            <h1>新增簽名文件</h1>
            
            <div class="wp-pdf-signature-upload">
                <form id="pdf-upload-form" enctype="multipart/form-data">
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="document_title">文件標題</label>
                            </th>
                            <td>
                                <input type="text" id="document_title" name="document_title" class="regular-text" placeholder="請輸入文件標題">
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <label for="document_description">文件描述</label>
                            </th>
                            <td>
                                <textarea id="document_description" name="document_description" class="large-text" rows="3" placeholder="請輸入文件描述（可選）"></textarea>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <label for="pdf_file">PDF文件</label>
                            </th>
                            <td>
                                <input type="file" id="pdf_file" name="pdf_file" accept=".pdf" required>
                                <p class="description">請選擇PDF文件（最大 <?php echo get_option('wp_pdf_signature_upload_max_size', 10); ?>MB）</p>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <input type="submit" class="button button-primary" value="上傳文件">
                    </p>
                </form>
                
                <div id="upload-progress" style="display: none;">
                    <p>正在上傳...</p>
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                </div>
                
                <div id="upload-result" style="display: none;"></div>
            </div>
            
            <!-- PDF編輯器 -->
            <div id="pdf-editor" style="display: none;">
                <h2>設定簽名欄位</h2>
                <div class="pdf-editor-toolbar">
                    <button type="button" class="button" id="add-signature-field">新增簽名欄位</button>
                    <button type="button" class="button" id="add-text-field">新增文字欄位</button>
                    <button type="button" class="button" id="add-date-field">新增日期欄位</button>
                    <button type="button" class="button button-primary" id="save-fields">保存欄位</button>
                    <button type="button" class="button" id="preview-document">預覽文件</button>
                </div>
                
                <div class="pdf-canvas-container">
                    <canvas id="pdf-canvas"></canvas>
                    <div id="signature-fields-overlay"></div>
                </div>
                
                <div class="field-properties">
                    <h3>欄位屬性</h3>
                    <div id="field-properties-content">
                        <p>請選擇一個欄位來編輯屬性</p>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * 簽名記錄頁面
     */
    public function signature_logs_page() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'pdf_signature_logs';
        
        $logs = $wpdb->get_results(
            "SELECT l.*, p.post_title 
             FROM $table_name l 
             LEFT JOIN {$wpdb->posts} p ON l.document_id = p.ID 
             ORDER BY l.created_at DESC 
             LIMIT 50",
            ARRAY_A
        );
        
        ?>
        <div class="wrap">
            <h1>簽名記錄</h1>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>文件名稱</th>
                        <th>簽名者</th>
                        <th>電子郵件</th>
                        <th>簽名時間</th>
                        <th>IP地址</th>
                        <th>狀態</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($logs): ?>
                        <?php foreach ($logs as $log): ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($log['post_title']); ?></strong>
                                </td>
                                <td><?php echo esc_html($log['signer_name']); ?></td>
                                <td><?php echo esc_html($log['signer_email']); ?></td>
                                <td><?php echo esc_html($log['created_at']); ?></td>
                                <td><?php echo esc_html($log['signer_ip']); ?></td>
                                <td>
                                    <span class="status-<?php echo esc_attr($log['status']); ?>">
                                        <?php echo $this->get_status_label($log['status']); ?>
                                    </span>
                                </td>
                                <td>
                                    <a href="#" class="button button-small view-signature" data-id="<?php echo esc_attr($log['id']); ?>">
                                        查看簽名
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="7">尚無簽名記錄</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }
    
    /**
     * 設定頁面
     */
    public function settings_page() {
        if (isset($_POST['submit'])) {
            // 保存設定
            $this->save_settings();
            echo '<div class="notice notice-success"><p>設定已保存</p></div>';
        }
        
        ?>
        <div class="wrap">
            <h1>PDF簽名系統設定</h1>
            
            <form method="post" action="">
                <?php wp_nonce_field('wp_pdf_signature_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="upload_max_size">上傳文件大小限制</label>
                        </th>
                        <td>
                            <input type="number" id="upload_max_size" name="upload_max_size" 
                                   value="<?php echo get_option('wp_pdf_signature_upload_max_size', 10); ?>" 
                                   min="1" max="100" class="small-text">
                            <span class="description">MB</span>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="signature_color">簽名顏色</label>
                        </th>
                        <td>
                            <input type="color" id="signature_color" name="signature_color" 
                                   value="<?php echo get_option('wp_pdf_signature_signature_color', '#000000'); ?>">
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="signature_width">簽名線條寬度</label>
                        </th>
                        <td>
                            <input type="number" id="signature_width" name="signature_width" 
                                   value="<?php echo get_option('wp_pdf_signature_signature_width', 3); ?>" 
                                   min="1" max="10" class="small-text">
                            <span class="description">像素</span>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="email_notifications">電子郵件通知</label>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" id="email_notifications" name="email_notifications" 
                                       value="1" <?php checked(get_option('wp_pdf_signature_email_notifications', 1)); ?>>
                                啟用簽名完成時的電子郵件通知
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="file_expiry_days">文件過期天數</label>
                        </th>
                        <td>
                            <input type="number" id="file_expiry_days" name="file_expiry_days" 
                                   value="<?php echo get_option('wp_pdf_signature_file_expiry_days', 30); ?>" 
                                   min="1" max="365" class="small-text">
                            <span class="description">天（文件在此時間後將被自動刪除）</span>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="security_level">安全級別</label>
                        </th>
                        <td>
                            <select id="security_level" name="security_level">
                                <option value="basic" <?php selected(get_option('wp_pdf_signature_security_level', 'medium'), 'basic'); ?>>
                                    基本 - 僅基本驗證
                                </option>
                                <option value="medium" <?php selected(get_option('wp_pdf_signature_security_level', 'medium'), 'medium'); ?>>
                                    中等 - 包含IP和時間戳記錄
                                </option>
                                <option value="high" <?php selected(get_option('wp_pdf_signature_security_level', 'medium'), 'high'); ?>>
                                    高級 - 完整審計軌跡和加密
                                </option>
                            </select>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <input type="submit" name="submit" class="button-primary" value="保存設定">
                </p>
            </form>
        </div>
        <?php
    }
    
    /**
     * 保存設定
     */
    private function save_settings() {
        if (!wp_verify_nonce($_POST['_wpnonce'], 'wp_pdf_signature_settings')) {
            return;
        }
        
        $settings = array(
            'wp_pdf_signature_upload_max_size' => intval($_POST['upload_max_size']),
            'wp_pdf_signature_signature_color' => sanitize_hex_color($_POST['signature_color']),
            'wp_pdf_signature_signature_width' => intval($_POST['signature_width']),
            'wp_pdf_signature_email_notifications' => isset($_POST['email_notifications']) ? 1 : 0,
            'wp_pdf_signature_file_expiry_days' => intval($_POST['file_expiry_days']),
            'wp_pdf_signature_security_level' => sanitize_text_field($_POST['security_level'])
        );
        
        foreach ($settings as $option => $value) {
            update_option($option, $value);
        }
    }
    
    /**
     * 添加元數據框
     */
    public function add_meta_boxes() {
        add_meta_box(
            'pdf-signature-info',
            'PDF簽名資訊',
            array($this, 'pdf_signature_info_meta_box'),
            'pdf_signature_doc',
            'normal',
            'high'
        );
        
        add_meta_box(
            'pdf-signature-fields',
            '簽名欄位',
            array($this, 'pdf_signature_fields_meta_box'),
            'pdf_signature_doc',
            'side',
            'default'
        );
    }
    
    /**
     * PDF簽名資訊元數據框
     */
    public function pdf_signature_info_meta_box($post) {
        wp_nonce_field('pdf_signature_meta_box', 'pdf_signature_meta_box_nonce');
        
        $file_path = get_post_meta($post->ID, '_pdf_file_path', true);
        $unique_id = get_post_meta($post->ID, '_pdf_unique_id', true);
        $status = get_post_meta($post->ID, '_pdf_signature_status', true);
        $signer_name = get_post_meta($post->ID, '_pdf_signer_name', true);
        $signer_email = get_post_meta($post->ID, '_pdf_signer_email', true);
        
        ?>
        <table class="form-table">
            <tr>
                <th scope="row">文件狀態</th>
                <td><?php echo $this->get_document_status_badge($post->ID); ?></td>
            </tr>
            
            <?php if ($file_path): ?>
                <tr>
                    <th scope="row">文件資訊</th>
                    <td>
                        <p><strong>文件ID:</strong> <?php echo esc_html($unique_id); ?></p>
                        <p><strong>檔案大小:</strong> <?php echo size_format(get_post_meta($post->ID, '_pdf_file_size', true)); ?></p>
                        <p><strong>頁數:</strong> <?php echo get_post_meta($post->ID, '_pdf_page_count', true); ?></p>
                        <p><strong>上傳時間:</strong> <?php echo get_post_meta($post->ID, '_pdf_upload_date', true); ?></p>
                    </td>
                </tr>
            <?php endif; ?>
            
            <?php if ($signer_name): ?>
                <tr>
                    <th scope="row">簽名者資訊</th>
                    <td>
                        <p><strong>姓名:</strong> <?php echo esc_html($signer_name); ?></p>
                        <p><strong>電子郵件:</strong> <?php echo esc_html($signer_email); ?></p>
                        <p><strong>簽名時間:</strong> <?php echo get_post_meta($post->ID, '_pdf_signature_date', true); ?></p>
                    </td>
                </tr>
            <?php endif; ?>
            
            <tr>
                <th scope="row">分享連結</th>
                <td>
                    <input type="text" class="regular-text" readonly 
                           value="<?php echo esc_attr($this->get_document_share_url($post->ID)); ?>">
                    <button type="button" class="button" id="copy-share-link">複製連結</button>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * 簽名欄位元數據框
     */
    public function pdf_signature_fields_meta_box($post) {
        ?>
        <div id="signature-fields-list">
            <p>載入中...</p>
        </div>
        
        <script>
            // 載入簽名欄位
            jQuery(document).ready(function($) {
                $.get(ajaxurl, {
                    action: 'get_signature_fields',
                    document_id: <?php echo $post->ID; ?>
                }, function(response) {
                    if (response.success) {
                        var html = '<ul>';
                        if (response.data.length > 0) {
                            $.each(response.data, function(index, field) {
                                html += '<li>' + field.field_name + ' (' + field.field_type + ')</li>';
                            });
                        } else {
                            html += '<li>尚無簽名欄位</li>';
                        }
                        html += '</ul>';
                        $('#signature-fields-list').html(html);
                    }
                });
            });
        </script>
        <?php
    }
    
    /**
     * 添加自定義列
     */
    public function add_custom_columns($columns) {
        $new_columns = array();
        $new_columns['cb'] = $columns['cb'];
        $new_columns['title'] = $columns['title'];
        $new_columns['signature_status'] = '簽名狀態';
        $new_columns['signer'] = '簽名者';
        $new_columns['signature_date'] = '簽名時間';
        $new_columns['share_link'] = '分享連結';
        $new_columns['date'] = $columns['date'];
        
        return $new_columns;
    }
    
    /**
     * 自定義列內容
     */
    public function custom_column_content($column, $post_id) {
        switch ($column) {
            case 'signature_status':
                echo $this->get_document_status_badge($post_id);
                break;
                
            case 'signer':
                $signer_name = get_post_meta($post_id, '_pdf_signer_name', true);
                $signer_email = get_post_meta($post_id, '_pdf_signer_email', true);
                if ($signer_name) {
                    echo esc_html($signer_name);
                    if ($signer_email) {
                        echo '<br><small>' . esc_html($signer_email) . '</small>';
                    }
                } else {
                    echo '—';
                }
                break;
                
            case 'signature_date':
                $signature_date = get_post_meta($post_id, '_pdf_signature_date', true);
                echo $signature_date ? esc_html($signature_date) : '—';
                break;
                
            case 'share_link':
                $share_url = $this->get_document_share_url($post_id);
                echo '<a href="' . esc_url($share_url) . '" target="_blank" class="button button-small">查看</a>';
                break;
        }
    }
    
    /**
     * 輔助方法
     */
    private function get_total_documents() {
        return wp_count_posts('pdf_signature_doc')->publish + wp_count_posts('pdf_signature_doc')->draft;
    }
    
    private function get_signed_documents() {
        $signed = get_posts(array(
            'post_type' => 'pdf_signature_doc',
            'post_status' => 'any',
            'numberposts' => -1,
            'meta_query' => array(
                array(
                    'key' => '_pdf_signature_status',
                    'value' => 'signed',
                    'compare' => '='
                )
            )
        ));
        return count($signed);
    }
    
    private function get_pending_documents() {
        $pending = get_posts(array(
            'post_type' => 'pdf_signature_doc',
            'post_status' => 'any',
            'numberposts' => -1,
            'meta_query' => array(
                array(
                    'key' => '_pdf_signature_status',
                    'value' => 'pending',
                    'compare' => '='
                )
            )
        ));
        return count($pending);
    }
    
    private function get_document_status_badge($post_id) {
        $status = get_post_meta($post_id, '_pdf_signature_status', true);
        $status = $status ?: 'pending';
        
        $badges = array(
            'pending' => '<span class="status-badge status-pending">待簽名</span>',
            'signed' => '<span class="status-badge status-signed">已簽名</span>',
            'expired' => '<span class="status-badge status-expired">已過期</span>'
        );
        
        return $badges[$status] ?? $badges['pending'];
    }
    
    private function get_document_share_url($post_id) {
        $unique_id = get_post_meta($post_id, '_pdf_unique_id', true);
        return home_url('/pdf-signature/' . $unique_id);
    }
    
    private function get_status_label($status) {
        $labels = array(
            'pending' => '待簽名',
            'signed' => '已簽名',
            'expired' => '已過期'
        );
        
        return $labels[$status] ?? '未知';
    }
}