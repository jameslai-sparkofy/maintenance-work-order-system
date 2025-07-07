const express = require('express');
const path = require('path');
const WorkOrder = require('../models/WorkOrder');

const router = express.Router();

// Serve HTML views - fix path for Render deployment
const viewsPath = path.join(__dirname, '../views');
console.log('Views path:', viewsPath);

// Home page - redirect to new work order form
router.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>維修工單管理系統</title></head>
        <body>
            <h1>🔧 維修工單管理系統</h1>
            <p>系統已成功部署在Render！</p>
            <ul>
                <li><a href="/maintenance/new">新增維修單</a></li>
                <li><a href="/maintenance/list">工單列表</a></li>
                <li><a href="/maintenance/workers">工務人員管理</a></li>
            </ul>
            <p>Views path: ${viewsPath}</p>
        </body>
        </html>
    `);
});

// New work order form
router.get('/maintenance/new', (req, res) => {
    res.sendFile(path.join(viewsPath, 'new-work-order.html'));
});

// Work order list/management page
router.get('/maintenance/list', (req, res) => {
    res.sendFile(path.join(viewsPath, 'work-order-list.html'));
});

// Worker management page
router.get('/maintenance/workers', (req, res) => {
    res.sendFile(path.join(viewsPath, 'worker-management.html'));
});

// Public work order view (for sharing with customers/supervisors)
router.get('/work-order/:uniqueLink', async (req, res) => {
    try {
        const workOrderModel = new WorkOrder();
        const workOrder = await workOrderModel.getByUniqueLink(req.params.uniqueLink);
        
        if (!workOrder) {
            return res.status(404).sendFile(path.join(viewsPath, 'not-found.html'));
        }
        
        // If already signed, show confirmation page
        if (workOrder.signature) {
            res.sendFile(path.join(viewsPath, 'work-order-confirmed.html'));
        } else {
            // Show signature page
            res.sendFile(path.join(viewsPath, 'work-order-signature.html'));
        }
        
    } catch (error) {
        console.error('Error serving work order view:', error);
        res.status(500).sendFile(path.join(viewsPath, 'error.html'));
    }
});

// API endpoint to get work order data for public view
router.get('/api/work-order-data/:uniqueLink', async (req, res) => {
    try {
        const workOrderModel = new WorkOrder();
        const workOrder = await workOrderModel.getByUniqueLink(req.params.uniqueLink);
        
        if (!workOrder) {
            return res.status(404).json({
                success: false,
                error: 'Work order not found'
            });
        }
        
        res.json({
            success: true,
            data: workOrder
        });
        
    } catch (error) {
        console.error('Error getting work order data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get work order data',
            message: error.message
        });
    }
});

module.exports = router;