const Database = require('../core/database');

class WorkOrder {
    constructor() {
        this.db = new Database();
    }

    async create(workOrderData) {
        try {
            await this.db.init();
            
            // Generate unique identifiers
            const workOrderNumber = await this.db.generateWorkOrderNumber();
            const uniqueLink = this.db.generateUniqueLink();
            
            const sql = `
                INSERT INTO work_orders (
                    work_order_number, date, site_name, building, floor, unit,
                    reason, worker_name, amount, unique_link
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                workOrderNumber,
                workOrderData.date || new Date().toISOString().slice(0, 10),
                workOrderData.siteName || null,
                workOrderData.building || null,
                workOrderData.floor || null,
                workOrderData.unit || null,
                workOrderData.reason || null,
                workOrderData.workerName || null,
                workOrderData.amount || 0,
                uniqueLink
            ];
            
            const result = await this.db.run(sql, params);
            
            // Update site usage if provided
            if (workOrderData.siteName) {
                await this.updateSiteUsage(workOrderData.siteName);
            }
            
            return {
                id: result.lastID,
                workOrderNumber,
                uniqueLink,
                ...workOrderData
            };
        } catch (error) {
            console.error('Error creating work order:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            await this.db.init();
            
            const sql = `
                SELECT * FROM work_orders 
                WHERE id = ?
            `;
            
            const workOrder = await this.db.get(sql, [id]);
            
            if (workOrder) {
                // Get associated photos
                const photos = await this.getPhotos(id);
                workOrder.photos = photos;
                
                // Get signature if exists
                const signature = await this.getSignature(id);
                workOrder.signature = signature;
            }
            
            return workOrder;
        } catch (error) {
            console.error('Error getting work order by ID:', error);
            throw error;
        }
    }

    async getByUniqueLink(uniqueLink) {
        try {
            await this.db.init();
            
            const sql = `
                SELECT * FROM work_orders 
                WHERE unique_link = ?
            `;
            
            const workOrder = await this.db.get(sql, [uniqueLink]);
            
            if (workOrder) {
                // Get associated photos
                const photos = await this.getPhotos(workOrder.id);
                workOrder.photos = photos;
                
                // Get signature if exists
                const signature = await this.getSignature(workOrder.id);
                workOrder.signature = signature;
            }
            
            return workOrder;
        } catch (error) {
            console.error('Error getting work order by unique link:', error);
            throw error;
        }
    }

    async getAll(filters = {}) {
        try {
            await this.db.init();
            
            let sql = 'SELECT * FROM work_orders WHERE 1=1';
            const params = [];
            
            // Apply filters
            if (filters.siteName) {
                sql += ' AND site_name LIKE ?';
                params.push(`%${filters.siteName}%`);
            }
            
            if (filters.building) {
                sql += ' AND building LIKE ?';
                params.push(`%${filters.building}%`);
            }
            
            if (filters.status) {
                sql += ' AND status = ?';
                params.push(filters.status);
            }
            
            if (filters.dateFrom) {
                sql += ' AND date >= ?';
                params.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                sql += ' AND date <= ?';
                params.push(filters.dateTo);
            }
            
            sql += ' ORDER BY created_at DESC';
            
            const workOrders = await this.db.all(sql, params);
            
            // Get photos and signatures for each work order
            for (const workOrder of workOrders) {
                workOrder.photos = await this.getPhotos(workOrder.id);
                workOrder.signature = await this.getSignature(workOrder.id);
            }
            
            return workOrders;
        } catch (error) {
            console.error('Error getting all work orders:', error);
            throw error;
        }
    }

    async addPhoto(workOrderId, photoData) {
        try {
            await this.db.init();
            
            const sql = `
                INSERT INTO work_order_photos (
                    work_order_id, photo_path, original_name, file_size
                ) VALUES (?, ?, ?, ?)
            `;
            
            const params = [
                workOrderId,
                photoData.path,
                photoData.originalName,
                photoData.size
            ];
            
            const result = await this.db.run(sql, params);
            return { id: result.lastID, ...photoData };
        } catch (error) {
            console.error('Error adding photo:', error);
            throw error;
        }
    }

    async getPhotos(workOrderId) {
        try {
            await this.db.init();
            
            const sql = 'SELECT * FROM work_order_photos WHERE work_order_id = ?';
            return await this.db.all(sql, [workOrderId]);
        } catch (error) {
            console.error('Error getting photos:', error);
            throw error;
        }
    }

    async addSignature(workOrderId, signatureData) {
        try {
            await this.db.init();
            
            const sql = `
                INSERT INTO signatures (
                    work_order_id, signature_data, signer_name, signer_email
                ) VALUES (?, ?, ?, ?)
            `;
            
            const params = [
                workOrderId,
                signatureData.data,
                signatureData.signerName || null,
                signatureData.signerEmail || null
            ];
            
            const result = await this.db.run(sql, params);
            
            // Update work order status to confirmed
            await this.updateStatus(workOrderId, 'confirmed');
            
            return { id: result.lastID, ...signatureData };
        } catch (error) {
            console.error('Error adding signature:', error);
            throw error;
        }
    }

    async getSignature(workOrderId) {
        try {
            await this.db.init();
            
            const sql = 'SELECT * FROM signatures WHERE work_order_id = ?';
            return await this.db.get(sql, [workOrderId]);
        } catch (error) {
            console.error('Error getting signature:', error);
            throw error;
        }
    }

    async updateStatus(workOrderId, status) {
        try {
            await this.db.init();
            
            const sql = `
                UPDATE work_orders 
                SET status = ?, updated_at = datetime('now') 
                WHERE id = ?
            `;
            
            const result = await this.db.run(sql, [status, workOrderId]);
            return result.changes > 0;
        } catch (error) {
            console.error('Error updating status:', error);
            throw error;
        }
    }

    async updateSiteUsage(siteName) {
        try {
            await this.db.init();
            
            const sql = `
                INSERT OR REPLACE INTO sites (name, last_used_at) 
                VALUES (?, datetime('now'))
            `;
            
            await this.db.run(sql, [siteName]);
        } catch (error) {
            console.error('Error updating site usage:', error);
            throw error;
        }
    }

    async getRecentSites(limit = 10) {
        try {
            await this.db.init();
            
            const sql = `
                SELECT name FROM sites 
                ORDER BY last_used_at DESC 
                LIMIT ?
            `;
            
            const sites = await this.db.all(sql, [limit]);
            return sites.map(site => site.name);
        } catch (error) {
            console.error('Error getting recent sites:', error);
            throw error;
        }
    }

    async delete(workOrderId) {
        try {
            await this.db.init();
            
            // Delete in correct order due to foreign key constraints
            
            // Delete signatures first
            await this.db.run('DELETE FROM signatures WHERE work_order_id = ?', [workOrderId]);
            
            // Delete photos
            await this.db.run('DELETE FROM photos WHERE work_order_id = ?', [workOrderId]);
            
            // Delete work order
            const result = await this.db.run('DELETE FROM work_orders WHERE id = ?', [workOrderId]);
            
            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting work order:', error);
            throw error;
        }
    }
}

module.exports = WorkOrder;