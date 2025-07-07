<?php
/**
 * 電子郵件通知類
 */

if (!defined('ABSPATH')) {
    exit;
}

class WP_PDF_Signature_Email_Notifications {
    
    private $templates_dir;
    
    public function __construct() {
        $this->templates_dir = WP_PDF_SIGNATURE_PLUGIN_DIR . 'templates/emails/';
        
        add_action('wp_pdf_signature_document_signed', array($this, 'send_signature_completion_emails'), 10, 2);
        add_action('wp_pdf_signature_document_created', array($this, 'send_document_creation_email'), 10, 1);
        add_action('wp_pdf_signature_signature_reminder', array($this, 'send_signature_reminder'), 10, 2);
        
        // 自定義郵件設定
        add_filter('wp_mail_content_type', array($this, 'set_html_content_type'));
        add_filter('wp_mail_from', array($this, 'custom_mail_from'));
        add_filter('wp_mail_from_name', array($this, 'custom_mail_from_name'));
    }
    
    /**
     * 發送簽名完成通知
     */
    public function send_signature_completion_emails($document_id, $signature_data) {
        if (!get_option('wp_pdf_signature_email_notifications', 1)) {
            return;
        }
        
        // 發送給簽名者的確認郵件
        $this->send_signer_confirmation($document_id, $signature_data);
        
        // 發送給管理員的通知郵件
        $this->send_admin_notification($document_id, $signature_data);
        
        // 發送給文件創建者的通知（如果不是管理員）
        $this->send_creator_notification($document_id, $signature_data);
    }
    
    /**
     * 發送簽名者確認郵件
     */
    private function send_signer_confirmation($document_id, $signature_data) {
        $document = get_post($document_id);
        $signer_email = $signature_data['signer_email'];
        $signer_name = $signature_data['signer_name'];
        
        $subject = sprintf(
            '[%s] 文件簽名確認 - %s',
            get_bloginfo('name'),
            $document->post_title
        );
        
        $template_vars = array(
            'signer_name' => $signer_name,
            'document_title' => $document->post_title,
            'document_url' => $this->get_document_url($document_id),
            'signature_date' => current_time('Y-m-d H:i:s'),
            'download_url' => $this->get_download_url($document_id, $signature_data['signature_hash']),
            'site_name' => get_bloginfo('name'),
            'site_url' => home_url(),
            'admin_email' => get_option('admin_email')
        );
        
        $message = $this->render_email_template('signer-confirmation', $template_vars);
        
        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . get_bloginfo('name') . ' <' . get_option('admin_email') . '>'
        );
        
        wp_mail($signer_email, $subject, $message, $headers);
        
        // 記錄郵件發送
        $this->log_email_sent('signer_confirmation', $signer_email, $document_id);
    }
    
    /**
     * 發送管理員通知郵件
     */
    private function send_admin_notification($document_id, $signature_data) {
        $document = get_post($document_id);
        $admin_email = get_option('admin_email');
        
        $subject = sprintf(
            '[%s] 新簽名通知 - %s',
            get_bloginfo('name'),
            $document->post_title
        );
        
        $template_vars = array(
            'document_title' => $document->post_title,
            'signer_name' => $signature_data['signer_name'],
            'signer_email' => $signature_data['signer_email'],
            'signature_date' => current_time('Y-m-d H:i:s'),
            'document_url' => $this->get_document_url($document_id),
            'admin_url' => admin_url('post.php?post=' . $document_id . '&action=edit'),
            'site_name' => get_bloginfo('name'),
            'site_url' => home_url()
        );
        
        $message = $this->render_email_template('admin-notification', $template_vars);
        
        $headers = array(
            'Content-Type: text/html; charset=UTF-8'
        );
        
        wp_mail($admin_email, $subject, $message, $headers);
        
        // 記錄郵件發送
        $this->log_email_sent('admin_notification', $admin_email, $document_id);
    }
    
    /**
     * 發送文件創建者通知
     */
    private function send_creator_notification($document_id, $signature_data) {
        $document = get_post($document_id);
        $creator = get_user_by('id', $document->post_author);
        
        if (!$creator || $creator->user_email === get_option('admin_email')) {
            return; // 跳過，避免重複通知
        }
        
        $subject = sprintf(
            '[%s] 您的文件已被簽名 - %s',
            get_bloginfo('name'),
            $document->post_title
        );
        
        $template_vars = array(
            'creator_name' => $creator->display_name,
            'document_title' => $document->post_title,
            'signer_name' => $signature_data['signer_name'],
            'signer_email' => $signature_data['signer_email'],
            'signature_date' => current_time('Y-m-d H:i:s'),
            'document_url' => $this->get_document_url($document_id),
            'admin_url' => admin_url('post.php?post=' . $document_id . '&action=edit'),
            'site_name' => get_bloginfo('name'),
            'site_url' => home_url()
        );
        
        $message = $this->render_email_template('creator-notification', $template_vars);
        
        $headers = array(
            'Content-Type: text/html; charset=UTF-8'
        );
        
        wp_mail($creator->user_email, $subject, $message, $headers);
        
        // 記錄郵件發送
        $this->log_email_sent('creator_notification', $creator->user_email, $document_id);
    }
    
    /**
     * 發送文件創建通知
     */
    public function send_document_creation_email($document_id) {
        if (!get_option('wp_pdf_signature_email_notifications', 1)) {
            return;
        }
        
        $document = get_post($document_id);
        $creator = get_user_by('id', $document->post_author);
        
        if (!$creator) {
            return;
        }
        
        $subject = sprintf(
            '[%s] 文件創建成功 - %s',
            get_bloginfo('name'),
            $document->post_title
        );
        
        $template_vars = array(
            'creator_name' => $creator->display_name,
            'document_title' => $document->post_title,
            'document_url' => $this->get_document_url($document_id),
            'share_url' => $this->get_share_url($document_id),
            'admin_url' => admin_url('post.php?post=' . $document_id . '&action=edit'),
            'creation_date' => get_the_date('Y-m-d H:i:s', $document_id),
            'site_name' => get_bloginfo('name'),
            'site_url' => home_url()
        );
        
        $message = $this->render_email_template('document-creation', $template_vars);
        
        $headers = array(
            'Content-Type: text/html; charset=UTF-8'
        );
        
        wp_mail($creator->user_email, $subject, $message, $headers);
        
        // 記錄郵件發送
        $this->log_email_sent('document_creation', $creator->user_email, $document_id);
    }
    
    /**
     * 發送簽名提醒
     */
    public function send_signature_reminder($document_id, $recipient_email) {
        $document = get_post($document_id);
        
        $subject = sprintf(
            '[%s] 簽名提醒 - %s',
            get_bloginfo('name'),
            $document->post_title
        );
        
        $template_vars = array(
            'document_title' => $document->post_title,
            'document_description' => $document->post_content,
            'document_url' => $this->get_document_url($document_id),
            'share_url' => $this->get_share_url($document_id),
            'site_name' => get_bloginfo('name'),
            'site_url' => home_url(),
            'contact_email' => get_option('admin_email')
        );
        
        $message = $this->render_email_template('signature-reminder', $template_vars);
        
        $headers = array(
            'Content-Type: text/html; charset=UTF-8'
        );
        
        wp_mail($recipient_email, $subject, $message, $headers);
        
        // 記錄郵件發送
        $this->log_email_sent('signature_reminder', $recipient_email, $document_id);
    }
    
    /**
     * 渲染電子郵件模板
     */
    private function render_email_template($template_name, $vars = array()) {
        $template_file = $this->templates_dir . $template_name . '.php';
        
        if (file_exists($template_file)) {
            // 提取變數到當前作用域
            extract($vars);
            
            ob_start();
            include $template_file;
            return ob_get_clean();
        }
        
        // 如果模板文件不存在，使用默認模板
        return $this->get_default_template($template_name, $vars);
    }
    
    /**
     * 獲取默認電子郵件模板
     */
    private function get_default_template($template_name, $vars) {
        $defaults = array(
            'signer-confirmation' => $this->get_signer_confirmation_template($vars),
            'admin-notification' => $this->get_admin_notification_template($vars),
            'creator-notification' => $this->get_creator_notification_template($vars),
            'document-creation' => $this->get_document_creation_template($vars),
            'signature-reminder' => $this->get_signature_reminder_template($vars)
        );
        
        return isset($defaults[$template_name]) ? $defaults[$template_name] : '';
    }
    
    /**
     * 簽名者確認模板
     */
    private function get_signer_confirmation_template($vars) {
        return "
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>簽名確認</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
                .content { padding: 20px 0; }
                .button { display: inline-block; padding: 12px 24px; background: #007cba; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>簽名確認</h1>
                </div>
                <div class='content'>
                    <p>親愛的 {$vars['signer_name']}，</p>
                    <p>您已成功簽署文件「<strong>{$vars['document_title']}</strong>」。</p>
                    <p><strong>簽名時間：</strong>{$vars['signature_date']}</p>
                    <p>您可以通過以下連結查看或下載已簽名的文件：</p>
                    <p><a href='{$vars['download_url']}' class='button'>下載已簽名文件</a></p>
                    <p>如有任何問題，請聯繫我們：{$vars['admin_email']}</p>
                </div>
                <div class='footer'>
                    <p>此郵件由 {$vars['site_name']} 自動發送，請勿回復。</p>
                    <p>網站：<a href='{$vars['site_url']}'>{$vars['site_url']}</a></p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    /**
     * 管理員通知模板
     */
    private function get_admin_notification_template($vars) {
        return "
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>新簽名通知</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
                .content { padding: 20px 0; }
                .info-box { background: #e7f3ff; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .button { display: inline-block; padding: 12px 24px; background: #007cba; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>新簽名通知</h1>
                </div>
                <div class='content'>
                    <p>有新的文件簽名：</p>
                    <div class='info-box'>
                        <p><strong>文件：</strong>{$vars['document_title']}</p>
                        <p><strong>簽名者：</strong>{$vars['signer_name']} ({$vars['signer_email']})</p>
                        <p><strong>簽名時間：</strong>{$vars['signature_date']}</p>
                    </div>
                    <p><a href='{$vars['admin_url']}' class='button'>管理此文件</a></p>
                    <p><a href='{$vars['document_url']}' class='button'>查看簽名文件</a></p>
                </div>
                <div class='footer'>
                    <p>此郵件由 {$vars['site_name']} 自動發送。</p>
                    <p>網站：<a href='{$vars['site_url']}'>{$vars['site_url']}</a></p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    /**
     * 文件創建者通知模板
     */
    private function get_creator_notification_template($vars) {
        return "
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>文件已被簽名</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
                .content { padding: 20px 0; }
                .success-box { background: #d4edda; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #28a745; }
                .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>文件簽名完成</h1>
                </div>
                <div class='content'>
                    <p>親愛的 {$vars['creator_name']}，</p>
                    <div class='success-box'>
                        <p><strong>好消息！</strong>您的文件「{$vars['document_title']}」已被成功簽名。</p>
                    </div>
                    <p><strong>簽名者：</strong>{$vars['signer_name']} ({$vars['signer_email']})</p>
                    <p><strong>簽名時間：</strong>{$vars['signature_date']}</p>
                    <p><a href='{$vars['admin_url']}' class='button'>管理此文件</a></p>
                    <p><a href='{$vars['document_url']}' class='button'>查看簽名文件</a></p>
                </div>
                <div class='footer'>
                    <p>此郵件由 {$vars['site_name']} 自動發送。</p>
                    <p>網站：<a href='{$vars['site_url']}'>{$vars['site_url']}</a></p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    /**
     * 文件創建模板
     */
    private function get_document_creation_template($vars) {
        return "
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>文件創建成功</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
                .content { padding: 20px 0; }
                .share-box { background: #fff3cd; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #ffc107; }
                .button { display: inline-block; padding: 12px 24px; background: #007cba; color: white; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>文件創建成功</h1>
                </div>
                <div class='content'>
                    <p>親愛的 {$vars['creator_name']}，</p>
                    <p>您的PDF簽名文件「<strong>{$vars['document_title']}</strong>」已成功創建。</p>
                    <p><strong>創建時間：</strong>{$vars['creation_date']}</p>
                    <div class='share-box'>
                        <p><strong>分享連結：</strong></p>
                        <p><a href='{$vars['share_url']}'>{$vars['share_url']}</a></p>
                        <p>請將此連結分享給需要簽名的人員。</p>
                    </div>
                    <p>
                        <a href='{$vars['admin_url']}' class='button'>編輯文件</a>
                        <a href='{$vars['document_url']}' class='button'>預覽文件</a>
                    </p>
                </div>
                <div class='footer'>
                    <p>此郵件由 {$vars['site_name']} 自動發送。</p>
                    <p>網站：<a href='{$vars['site_url']}'>{$vars['site_url']}</a></p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    /**
     * 簽名提醒模板
     */
    private function get_signature_reminder_template($vars) {
        return "
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>簽名提醒</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
                .content { padding: 20px 0; }
                .reminder-box { background: #fff3cd; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #ffc107; }
                .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>文件簽名提醒</h1>
                </div>
                <div class='content'>
                    <p>您好，</p>
                    <div class='reminder-box'>
                        <p><strong>提醒：</strong>您有一份文件等待簽名。</p>
                    </div>
                    <p><strong>文件名稱：</strong>{$vars['document_title']}</p>
                    <p><strong>文件描述：</strong>{$vars['document_description']}</p>
                    <p>請點擊下方按鈕完成簽名：</p>
                    <p><a href='{$vars['share_url']}' class='button'>立即簽名</a></p>
                    <p>如有任何問題，請聯繫：{$vars['contact_email']}</p>
                </div>
                <div class='footer'>
                    <p>此郵件由 {$vars['site_name']} 自動發送，請勿回復。</p>
                    <p>網站：<a href='{$vars['site_url']}'>{$vars['site_url']}</a></p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    /**
     * 設定HTML內容類型
     */
    public function set_html_content_type() {
        return 'text/html';
    }
    
    /**
     * 自定義發件人地址
     */
    public function custom_mail_from($original_email_address) {
        $custom_email = get_option('wp_pdf_signature_from_email');
        return $custom_email ? $custom_email : $original_email_address;
    }
    
    /**
     * 自定義發件人名稱
     */
    public function custom_mail_from_name($original_email_from) {
        $custom_name = get_option('wp_pdf_signature_from_name');
        return $custom_name ? $custom_name : $original_email_from;
    }
    
    /**
     * 輔助方法
     */
    private function get_document_url($document_id) {
        $unique_id = get_post_meta($document_id, '_pdf_unique_id', true);
        return home_url('/pdf-signature/' . $unique_id);
    }
    
    private function get_share_url($document_id) {
        return $this->get_document_url($document_id);
    }
    
    private function get_download_url($document_id, $signature_hash) {
        return add_query_arg(array(
            'action' => 'download_signed_pdf',
            'document_id' => $document_id,
            'signature_hash' => $signature_hash,
            'nonce' => wp_create_nonce('download_pdf_nonce')
        ), admin_url('admin-ajax.php'));
    }
    
    /**
     * 記錄郵件發送
     */
    private function log_email_sent($email_type, $recipient, $document_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'pdf_signature_email_log';
        
        // 創建郵件日誌表（如果不存在）
        $this->maybe_create_email_log_table();
        
        $wpdb->insert(
            $table_name,
            array(
                'email_type' => $email_type,
                'recipient' => $recipient,
                'document_id' => $document_id,
                'sent_at' => current_time('mysql'),
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            )
        );
    }
    
    /**
     * 創建郵件日誌表
     */
    private function maybe_create_email_log_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'pdf_signature_email_log';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            email_type varchar(50) NOT NULL,
            recipient varchar(255) NOT NULL,
            document_id bigint(20) DEFAULT NULL,
            sent_at datetime DEFAULT CURRENT_TIMESTAMP,
            ip_address varchar(45) DEFAULT NULL,
            PRIMARY KEY (id),
            KEY email_type (email_type),
            KEY recipient (recipient),
            KEY document_id (document_id),
            KEY sent_at (sent_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}