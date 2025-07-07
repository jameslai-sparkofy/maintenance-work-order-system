const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.init();
    }

    init() {
        // Configure email transporter
        this.transporter = nodemailer.createTransporter({
            // For development - use ethereal email (fake SMTP)
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
                pass: process.env.SMTP_PASS || 'ethereal.pass'
            }
        });

        // For production, use real SMTP settings:
        /*
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        */
    }

    async sendConfirmationEmail({ to, workOrder, signerName }) {
        try {
            const mailOptions = {
                from: process.env.FROM_EMAIL || '"Maintenance System" <maintenance@company.com>',
                to: to,
                subject: `維修單確認 - ${workOrder.work_order_number}`,
                html: this.generateConfirmationEmailHTML(workOrder, signerName)
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            console.log('✅ Confirmation email sent:', info.messageId);
            
            // For development with ethereal email, log the preview URL
            if (process.env.NODE_ENV !== 'production') {
                console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
            }
            
            return {
                success: true,
                messageId: info.messageId
            };
            
        } catch (error) {
            console.error('❌ Failed to send confirmation email:', error);
            throw error;
        }
    }

    generateConfirmationEmailHTML(workOrder, signerName) {
        return `
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>維修單確認</title>
            <style>
                body {
                    font-family: 'Microsoft JhengHei', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    background-color: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #007bff;
                    margin: 0;
                    font-size: 24px;
                }
                .work-order-info {
                    background-color: #f8f9fa;
                    border-radius: 6px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .info-row {
                    display: flex;
                    margin-bottom: 10px;
                }
                .info-label {
                    font-weight: bold;
                    min-width: 100px;
                    color: #495057;
                }
                .info-value {
                    color: #212529;
                }
                .signature-info {
                    background-color: #d4edda;
                    border: 1px solid #c3e6cb;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 20px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                    color: #6c757d;
                    font-size: 14px;
                }
                .status-badge {
                    background-color: #28a745;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔧 維修單確認通知</h1>
                    <p>您的維修單已完成確認</p>
                </div>

                <div class="signature-info">
                    <h3>✅ 簽名確認完成</h3>
                    <p><strong>簽名人員：</strong> ${signerName || '未提供'}</p>
                    <p><strong>確認時間：</strong> ${new Date().toLocaleString('zh-TW')}</p>
                    <p><strong>狀態：</strong> <span class="status-badge">已確認</span></p>
                </div>

                <div class="work-order-info">
                    <h3>📋 維修單詳細資料</h3>
                    
                    <div class="info-row">
                        <div class="info-label">維修單號：</div>
                        <div class="info-value"><strong>${workOrder.work_order_number}</strong></div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label">日期：</div>
                        <div class="info-value">${workOrder.date}</div>
                    </div>
                    
                    ${workOrder.site_name ? `
                    <div class="info-row">
                        <div class="info-label">案場：</div>
                        <div class="info-value">${workOrder.site_name}</div>
                    </div>
                    ` : ''}
                    
                    ${workOrder.building || workOrder.floor || workOrder.unit ? `
                    <div class="info-row">
                        <div class="info-label">位置：</div>
                        <div class="info-value">${[workOrder.building, workOrder.floor, workOrder.unit].filter(Boolean).join(' / ')}</div>
                    </div>
                    ` : ''}
                    
                    ${workOrder.reason ? `
                    <div class="info-row">
                        <div class="info-label">維修原因：</div>
                        <div class="info-value">${workOrder.reason}</div>
                    </div>
                    ` : ''}
                    
                    ${workOrder.worker_name ? `
                    <div class="info-row">
                        <div class="info-label">工務人員：</div>
                        <div class="info-value">${workOrder.worker_name}</div>
                    </div>
                    ` : ''}
                    
                    ${workOrder.amount > 0 ? `
                    <div class="info-row">
                        <div class="info-label">金額：</div>
                        <div class="info-value">NT$ ${workOrder.amount.toLocaleString()}</div>
                    </div>
                    ` : ''}
                </div>

                <div class="footer">
                    <p>此為系統自動發送的確認信件，請勿直接回覆</p>
                    <p>如有任何問題，請聯繫相關負責人員</p>
                    <p>© ${new Date().getFullYear()} 維修工單管理系統</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service connection verified');
            return true;
        } catch (error) {
            console.error('❌ Email service connection failed:', error);
            return false;
        }
    }
}

module.exports = EmailService;