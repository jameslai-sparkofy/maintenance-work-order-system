const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const WorkOrder = require('../models/WorkOrder');
const Worker = require('../models/Worker');
const EmailService = require('../services/emailService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../../../output/uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        // Allow images only
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Create new work order
router.post('/', upload.array('photos', 10), async (req, res) => {
    try {
        const workOrderModel = new WorkOrder();
        
        // Create work order
        const workOrder = await workOrderModel.create({
            date: req.body.date,
            siteName: req.body.siteName,
            building: req.body.building,
            floor: req.body.floor,
            unit: req.body.unit,
            reason: req.body.reason,
            workerName: req.body.workerName,
            amount: parseFloat(req.body.amount) || 0
        });
        
        // Handle photo uploads
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await workOrderModel.addPhoto(workOrder.id, {
                    path: file.filename,
                    originalName: file.originalname,
                    size: file.size
                });
            }
        }
        
        // Get complete work order with photos
        const completeWorkOrder = await workOrderModel.getById(workOrder.id);
        
        res.status(201).json({
            success: true,
            data: completeWorkOrder,
            shareUrl: `/work-order/${workOrder.uniqueLink}`
        });
        
    } catch (error) {
        console.error('Error creating work order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create work order',
            message: error.message
        });
    }
});

// Get all work orders with filtering
router.get('/', async (req, res) => {
    try {
        const workOrderModel = new WorkOrder();
        const filters = {
            siteName: req.query.siteName,
            building: req.query.building,
            status: req.query.status,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo
        };
        
        const workOrders = await workOrderModel.getAll(filters);
        
        res.json({
            success: true,
            data: workOrders,
            total: workOrders.length
        });
        
    } catch (error) {
        console.error('Error getting work orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get work orders',
            message: error.message
        });
    }
});

// Get work order by ID
router.get('/:id', async (req, res) => {
    try {
        const workOrderModel = new WorkOrder();
        const workOrder = await workOrderModel.getById(req.params.id);
        
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
        console.error('Error getting work order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get work order',
            message: error.message
        });
    }
});

// Add signature to work order
router.post('/:id/signature', async (req, res) => {
    try {
        const workOrderModel = new WorkOrder();
        const emailService = new EmailService();
        
        // Check if work order exists
        const workOrder = await workOrderModel.getById(req.params.id);
        if (!workOrder) {
            return res.status(404).json({
                success: false,
                error: 'Work order not found'
            });
        }
        
        // Add signature
        const signature = await workOrderModel.addSignature(req.params.id, {
            data: req.body.signatureData,
            signerName: req.body.signerName,
            signerEmail: req.body.signerEmail
        });
        
        // Send email notification if email provided
        if (req.body.signerEmail) {
            try {
                await emailService.sendConfirmationEmail({
                    to: req.body.signerEmail,
                    workOrder: workOrder,
                    signerName: req.body.signerName
                });
            } catch (emailError) {
                console.error('Failed to send email:', emailError);
                // Don't fail the entire request if email fails
            }
        }
        
        res.json({
            success: true,
            data: signature,
            message: 'Work order signed successfully'
        });
        
    } catch (error) {
        console.error('Error adding signature:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add signature',
            message: error.message
        });
    }
});

// Get recent sites
router.get('/sites/recent', async (req, res) => {
    try {
        const workOrderModel = new WorkOrder();
        const sites = await workOrderModel.getRecentSites();
        
        res.json({
            success: true,
            data: sites
        });
        
    } catch (error) {
        console.error('Error getting recent sites:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recent sites',
            message: error.message
        });
    }
});

// Worker management routes
router.get('/workers/all', async (req, res) => {
    try {
        const workerModel = new Worker();
        const workers = await workerModel.getAll();
        
        res.json({
            success: true,
            data: workers
        });
        
    } catch (error) {
        console.error('Error getting workers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get workers',
            message: error.message
        });
    }
});

router.post('/workers', async (req, res) => {
    try {
        const workerModel = new Worker();
        const worker = await workerModel.create({
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email
        });
        
        res.status(201).json({
            success: true,
            data: worker
        });
        
    } catch (error) {
        console.error('Error creating worker:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create worker',
            message: error.message
        });
    }
});

// Update worker
router.put('/workers/:id', async (req, res) => {
    try {
        const workerModel = new Worker();
        const updated = await workerModel.update(req.params.id, {
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email
        });
        
        if (updated) {
            res.json({
                success: true,
                message: 'Worker updated successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Worker not found'
            });
        }
        
    } catch (error) {
        console.error('Error updating worker:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update worker',
            message: error.message
        });
    }
});

// Delete worker
router.delete('/workers/:id', async (req, res) => {
    try {
        const workerModel = new Worker();
        const deleted = await workerModel.delete(req.params.id);
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Worker deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Worker not found'
            });
        }
        
    } catch (error) {
        console.error('Error deleting worker:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete worker',
            message: error.message
        });
    }
});

// Delete work order
router.delete('/:id', async (req, res) => {
    try {
        const workOrderModel = new WorkOrder();
        
        // Check if work order exists
        const workOrder = await workOrderModel.getById(req.params.id);
        if (!workOrder) {
            return res.status(404).json({
                success: false,
                error: 'Work order not found'
            });
        }
        
        // Delete associated photos
        if (workOrder.photos && workOrder.photos.length > 0) {
            for (const photo of workOrder.photos) {
                try {
                    const photoPath = path.join(__dirname, '../../../../output/uploads', photo.photo_path);
                    await fs.unlink(photoPath);
                } catch (photoError) {
                    console.error('Error deleting photo file:', photoError);
                    // Continue even if photo deletion fails
                }
            }
        }
        
        // Delete work order
        const deleted = await workOrderModel.delete(req.params.id);
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Work order deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Work order not found'
            });
        }
        
    } catch (error) {
        console.error('Error deleting work order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete work order',
            message: error.message
        });
    }
});

module.exports = router;