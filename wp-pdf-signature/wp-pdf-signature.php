<?php
/**
 * Plugin Name: WP PDF Signature
 * Description: WordPress PDF線上簽名系統 - 基於DocuSeal概念開發
 * Version: 1.0.0
 * Author: Claude AI
 * License: GPL v2 or later
 * Text Domain: wp-pdf-signature
 */

// 防止直接訪問
if (!defined('ABSPATH')) {
    exit;
}

// 定義常數
define('WP_PDF_SIGNATURE_VERSION', '1.0.0');
define('WP_PDF_SIGNATURE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WP_PDF_SIGNATURE_PLUGIN_URL', plugin_dir_url(__FILE__));

// 立即載入超早期修復器
require_once WP_PDF_SIGNATURE_PLUGIN_DIR . 'super-early-fix.php';

// 立即載入兼容性修復器
require_once WP_PDF_SIGNATURE_PLUGIN_DIR . 'compatibility-loader.php';

// 主要插件類
class WP_PDF_Signature {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // 最早的時機載入兼容性修復
        add_action('wp_head', array($this, 'inject_compatibility_script'), 1);
        add_action('admin_head', array($this, 'inject_compatibility_script'), 1);
        
        add_action('init', array($this, 'init'));
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        // 優先載入兼容性修復
        add_action('wp_enqueue_scripts', array($this, 'enqueue_early_compatibility'), 1);
        add_action('admin_enqueue_scripts', array($this, 'enqueue_early_compatibility'), 1);
        
        // 載入核心文件
        $this->load_includes();
        
        // 註冊自定義文章類型
        $this->register_post_types();
        
        // 初始化管理員介面
        if (is_admin()) {
            $this->init_admin();
        }
        
        // 初始化前端功能
        $this->init_frontend();
    }
    
    private function load_includes() {
        require_once WP_PDF_SIGNATURE_PLUGIN_DIR . 'includes/class-pdf-handler.php';
        require_once WP_PDF_SIGNATURE_PLUGIN_DIR . 'includes/class-signature-capture.php';
        require_once WP_PDF_SIGNATURE_PLUGIN_DIR . 'includes/class-security-manager.php';
        require_once WP_PDF_SIGNATURE_PLUGIN_DIR . 'includes/class-database-manager.php';
        require_once WP_PDF_SIGNATURE_PLUGIN_DIR . 'includes/class-email-notifications.php';
        require_once WP_PDF_SIGNATURE_PLUGIN_DIR . 'admin/class-admin-interface.php';
        require_once WP_PDF_SIGNATURE_PLUGIN_DIR . 'public/class-public-interface.php';
    }
    
    private function register_post_types() {
        // 註冊簽名文件自定義文章類型
        register_post_type('pdf_signature_doc', array(
            'labels' => array(
                'name' => __('PDF簽名文件', 'wp-pdf-signature'),
                'singular_name' => __('PDF簽名文件', 'wp-pdf-signature'),
                'add_new' => __('新增文件', 'wp-pdf-signature'),
                'add_new_item' => __('新增PDF簽名文件', 'wp-pdf-signature'),
                'edit_item' => __('編輯PDF簽名文件', 'wp-pdf-signature'),
                'new_item' => __('新PDF簽名文件', 'wp-pdf-signature'),
                'view_item' => __('查看PDF簽名文件', 'wp-pdf-signature'),
                'search_items' => __('搜尋PDF簽名文件', 'wp-pdf-signature'),
                'not_found' => __('找不到PDF簽名文件', 'wp-pdf-signature'),
                'not_found_in_trash' => __('回收站中沒有PDF簽名文件', 'wp-pdf-signature')
            ),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'menu_icon' => 'dashicons-media-document',
            'capability_type' => 'post',
            'hierarchical' => false,
            'supports' => array('title', 'editor', 'thumbnail', 'custom-fields'),
            'has_archive' => false,
            'rewrite' => false,
            'query_var' => false
        ));
    }
    
    private function init_admin() {
        new WP_PDF_Signature_Admin();
    }
    
    private function init_frontend() {
        new WP_PDF_Signature_Public();
    }
    
    /**
     * 直接在head中注入兼容性修復腳本
     */
    public function inject_compatibility_script() {
        static $injected = false;
        
        if ($injected) {
            return;
        }
        
        $injected = true;
        
        // 先載入終極兼容性修復
        echo '<script type="text/javascript" src="' . WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/force-compatibility.js?v=' . WP_PDF_SIGNATURE_VERSION . '"></script>';
        
        // 直接輸出JavaScript代碼，確保最早執行
        ?>
        <script type="text/javascript">
        // PDF簽名系統 - 立即執行的jQuery兼容性修復
        (function() {
            'use strict';
            
            // 立即攔截addEventListener - 必須在任何其他腳本執行前
            if (typeof window !== 'undefined' && window.EventTarget) {
                const deprecatedEvents = [
                    'DOMNodeInserted', 'DOMNodeRemoved', 'DOMSubtreeModified',
                    'DOMAttrModified', 'DOMCharacterDataModified'
                ];
                
                const originalAddEventListener = EventTarget.prototype.addEventListener;
                EventTarget.prototype.addEventListener = function(type, listener, options) {
                    if (deprecatedEvents.includes(type)) {
                        console.info('PDF簽名系統: 已攔截deprecated mutation event "' + type + '"');
                        return; // 直接忽略，不註冊事件
                    }
                    return originalAddEventListener.call(this, type, listener, options);
                };
                
                // 攔截console.warn來靜默處理警告
                if (window.console && window.console.warn) {
                    const originalWarn = console.warn;
                    console.warn = function() {
                        const message = Array.prototype.slice.call(arguments).join(' ');
                        
                        // 過濾特定警告
                        if (message.includes('DOMNodeInserted') || 
                            message.includes('mutation event') ||
                            message.includes('Support for this event type has been removed') ||
                            message.includes('message channel closed') ||
                            message.includes('asynchronous response by returning true')) {
                            return; // 靜默處理
                        }
                        
                        originalWarn.apply(console, arguments);
                    };
                }
                
                // 攔截console.error來靜默處理錯誤
                if (window.console && window.console.error) {
                    const originalError = console.error;
                    console.error = function() {
                        const message = Array.prototype.slice.call(arguments).join(' ');
                        
                        if (message.includes('message channel closed') ||
                            message.includes('asynchronous response by returning true')) {
                            return; // 靜默處理
                        }
                        
                        originalError.apply(console, arguments);
                    };
                }
                
                // 設定一個定時器來攔截延遲載入的jQuery
                let jqueryInterceptAttempts = 0;
                const maxAttempts = 50; // 5秒內檢查
                
                function interceptJQuery() {
                    if (jqueryInterceptAttempts++ > maxAttempts) {
                        return;
                    }
                    
                    if (typeof window.jQuery !== 'undefined') {
                        const $ = window.jQuery;
                        
                        // 攔截jQuery的事件方法
                        if ($.fn.on) {
                            const originalOn = $.fn.on;
                            $.fn.on = function(events, selector, data, handler) {
                                if (typeof events === 'string') {
                                    // 移除所有mutation events
                                    events = events.replace(/DOMNodeInserted|DOMNodeRemoved|DOMSubtreeModified|DOMAttrModified|DOMCharacterDataModified/g, '');
                                    if (!events.trim()) {
                                        console.info('PDF簽名系統: 攔截了jQuery mutation events');
                                        return this;
                                    }
                                }
                                return originalOn.call(this, events, selector, data, handler);
                            };
                        }
                        
                        if ($.fn.bind) {
                            const originalBind = $.fn.bind;
                            $.fn.bind = function(types, data, fn) {
                                if (typeof types === 'string') {
                                    types = types.replace(/DOMNodeInserted|DOMNodeRemoved|DOMSubtreeModified|DOMAttrModified|DOMCharacterDataModified/g, '');
                                    if (!types.trim()) {
                                        console.info('PDF簽名系統: 攔截了jQuery bind mutation events');
                                        return this;
                                    }
                                }
                                return originalBind.call(this, types, data, fn);
                            };
                        }
                        
                        // 攔截jQuery內部的add方法
                        if ($.event && $.event.add) {
                            const originalEventAdd = $.event.add;
                            $.event.add = function(elem, types, handler, data, selector) {
                                if (typeof types === 'string') {
                                    const deprecatedEvents = ['DOMNodeInserted', 'DOMNodeRemoved', 'DOMSubtreeModified', 'DOMAttrModified', 'DOMCharacterDataModified'];
                                    for (let i = 0; i < deprecatedEvents.length; i++) {
                                        if (types.includes(deprecatedEvents[i])) {
                                            console.info('PDF簽名系統: 攔截了jQuery.event.add mutation event: ' + deprecatedEvents[i]);
                                            return;
                                        }
                                    }
                                }
                                return originalEventAdd.call(this, elem, types, handler, data, selector);
                            };
                        }
                        
                        console.info('PDF簽名系統: jQuery兼容性修復已套用');
                    } else {
                        // 如果jQuery還沒載入，繼續等待
                        setTimeout(interceptJQuery, 100);
                    }
                }
                
                // 立即嘗試一次，然後設定延遲檢查
                interceptJQuery();
                
                console.info('PDF簽名系統: 兼容性修復已載入 (inline)');
            }
        })();
        </script>
        <?php
    }
    
    /**
     * 載入早期兼容性修復腳本
     */
    public function enqueue_early_compatibility() {
        // 只載入一次，且優先級最高
        if (!wp_script_is('wp-pdf-signature-early-compatibility', 'enqueued')) {
            wp_enqueue_script(
                'wp-pdf-signature-early-compatibility',
                WP_PDF_SIGNATURE_PLUGIN_URL . 'assets/js/early-compatibility.js',
                array(),
                WP_PDF_SIGNATURE_VERSION,
                false // 載入在head中，確保最早執行
            );
        }
    }
    
    public function load_textdomain() {
        load_plugin_textdomain('wp-pdf-signature', false, dirname(plugin_basename(__FILE__)) . '/languages/');
    }
    
    public function activate() {
        // 創建資料庫表
        $this->create_database_tables();
        
        // 設定預設選項
        $this->set_default_options();
        
        // 清空重寫規則
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        // 清空重寫規則
        flush_rewrite_rules();
    }
    
    private function create_database_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // 簽名記錄表
        $table_name = $wpdb->prefix . 'pdf_signature_logs';
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            document_id bigint(20) NOT NULL,
            user_id bigint(20) DEFAULT NULL,
            signature_data longtext NOT NULL,
            signature_hash varchar(255) NOT NULL,
            signer_name varchar(255) NOT NULL,
            signer_email varchar(255) NOT NULL,
            signer_ip varchar(45) NOT NULL,
            user_agent text NOT NULL,
            signature_position text NOT NULL,
            status varchar(20) DEFAULT 'pending',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY document_id (document_id),
            KEY user_id (user_id),
            KEY status (status)
        ) $charset_collate;";
        
        // 簽名欄位表
        $table_name_fields = $wpdb->prefix . 'pdf_signature_fields';
        $sql_fields = "CREATE TABLE $table_name_fields (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            document_id bigint(20) NOT NULL,
            field_type varchar(50) NOT NULL,
            field_name varchar(255) NOT NULL,
            field_position text NOT NULL,
            field_size text NOT NULL,
            field_required tinyint(1) DEFAULT 0,
            field_order int(11) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY document_id (document_id),
            KEY field_type (field_type)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        dbDelta($sql_fields);
    }
    
    private function set_default_options() {
        $default_options = array(
            'wp_pdf_signature_version' => WP_PDF_SIGNATURE_VERSION,
            'wp_pdf_signature_upload_max_size' => '10', // MB
            'wp_pdf_signature_allowed_file_types' => 'pdf',
            'wp_pdf_signature_signature_color' => '#000000',
            'wp_pdf_signature_signature_width' => '3',
            'wp_pdf_signature_email_notifications' => '1',
            'wp_pdf_signature_security_level' => 'medium'
        );
        
        foreach ($default_options as $option => $value) {
            if (!get_option($option)) {
                add_option($option, $value);
            }
        }
    }
}

// 初始化插件
function wp_pdf_signature_init() {
    return WP_PDF_Signature::get_instance();
}

// 啟動插件
wp_pdf_signature_init();

// 輔助函數
function wp_pdf_signature_get_upload_dir() {
    $upload_dir = wp_upload_dir();
    $pdf_signature_dir = $upload_dir['basedir'] . '/pdf-signatures/';
    
    if (!file_exists($pdf_signature_dir)) {
        wp_mkdir_p($pdf_signature_dir);
        
        // 創建 .htaccess 文件保護目錄
        $htaccess_content = "deny from all\n";
        file_put_contents($pdf_signature_dir . '.htaccess', $htaccess_content);
    }
    
    return $pdf_signature_dir;
}

function wp_pdf_signature_generate_unique_id() {
    return uniqid('pdf_sig_', true);
}

function wp_pdf_signature_is_valid_pdf($file_path) {
    if (!file_exists($file_path)) {
        return false;
    }
    
    $handle = fopen($file_path, 'rb');
    $header = fread($handle, 4);
    fclose($handle);
    
    return ($header === '%PDF');
}