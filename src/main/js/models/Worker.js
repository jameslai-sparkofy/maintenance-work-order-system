const Database = require('../core/database');

class Worker {
    constructor() {
        this.db = new Database();
    }

    async create(workerData) {
        try {
            await this.db.init();
            
            const sql = `
                INSERT INTO workers (name, phone, email)
                VALUES (?, ?, ?)
            `;
            
            const params = [
                workerData.name,
                workerData.phone || null,
                workerData.email || null
            ];
            
            const result = await this.db.run(sql, params);
            
            return {
                id: result.lastID,
                ...workerData
            };
        } catch (error) {
            console.error('Error creating worker:', error);
            throw error;
        }
    }

    async getAll() {
        try {
            await this.db.init();
            
            const sql = 'SELECT * FROM workers ORDER BY name ASC';
            return await this.db.all(sql);
        } catch (error) {
            console.error('Error getting all workers:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            await this.db.init();
            
            const sql = 'SELECT * FROM workers WHERE id = ?';
            return await this.db.get(sql, [id]);
        } catch (error) {
            console.error('Error getting worker by ID:', error);
            throw error;
        }
    }

    async update(id, workerData) {
        try {
            await this.db.init();
            
            const sql = `
                UPDATE workers 
                SET name = ?, phone = ?, email = ?
                WHERE id = ?
            `;
            
            const params = [
                workerData.name,
                workerData.phone || null,
                workerData.email || null,
                id
            ];
            
            const result = await this.db.run(sql, params);
            return result.changes > 0;
        } catch (error) {
            console.error('Error updating worker:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            await this.db.init();
            
            const sql = 'DELETE FROM workers WHERE id = ?';
            const result = await this.db.run(sql, [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting worker:', error);
            throw error;
        }
    }

    async search(query) {
        try {
            await this.db.init();
            
            const sql = `
                SELECT * FROM workers 
                WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
                ORDER BY name ASC
            `;
            
            const searchPattern = `%${query}%`;
            const params = [searchPattern, searchPattern, searchPattern];
            
            return await this.db.all(sql, params);
        } catch (error) {
            console.error('Error searching workers:', error);
            throw error;
        }
    }
}

module.exports = Worker;