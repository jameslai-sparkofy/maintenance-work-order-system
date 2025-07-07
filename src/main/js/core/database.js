const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../../../../output/database.sqlite');
        this.db = null;
    }

    async init() {
        try {
            // Ensure output directory exists
            const outputDir = path.dirname(this.dbPath);
            await fs.mkdir(outputDir, { recursive: true });

            // Create database connection
            this.db = new sqlite3.Database(this.dbPath);
            
            // Create tables
            await this.createTables();
            
            console.log('✅ Database connected successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async createTables() {
        const queries = [
            // Work Orders table
            `CREATE TABLE IF NOT EXISTS work_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_order_number TEXT UNIQUE NOT NULL,
                date TEXT DEFAULT (date('now')),
                site_name TEXT,
                building TEXT,
                floor TEXT,
                unit TEXT,
                reason TEXT,
                worker_name TEXT,
                amount REAL DEFAULT 0,
                status TEXT DEFAULT 'pending',
                unique_link TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )`,
            
            // Work Order Photos table
            `CREATE TABLE IF NOT EXISTS work_order_photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_order_id INTEGER NOT NULL,
                photo_path TEXT NOT NULL,
                original_name TEXT,
                file_size INTEGER,
                uploaded_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE CASCADE
            )`,
            
            // Workers table
            `CREATE TABLE IF NOT EXISTS workers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )`,
            
            // Signatures table
            `CREATE TABLE IF NOT EXISTS signatures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_order_id INTEGER NOT NULL,
                signature_data TEXT NOT NULL,
                signer_name TEXT,
                signer_email TEXT,
                signed_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE CASCADE
            )`,
            
            // Sites table (for remembering previous sites)
            `CREATE TABLE IF NOT EXISTS sites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                last_used_at TEXT DEFAULT (datetime('now'))
            )`
        ];

        for (const query of queries) {
            await this.run(query);
        }

        // Create indexes for better performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_work_orders_number ON work_orders(work_order_number)',
            'CREATE INDEX IF NOT EXISTS idx_work_orders_link ON work_orders(unique_link)',
            'CREATE INDEX IF NOT EXISTS idx_work_orders_site ON work_orders(site_name)',
            'CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status)',
            'CREATE INDEX IF NOT EXISTS idx_work_orders_date ON work_orders(date)',
            'CREATE INDEX IF NOT EXISTS idx_photos_work_order ON work_order_photos(work_order_id)',
            'CREATE INDEX IF NOT EXISTS idx_signatures_work_order ON signatures(work_order_id)'
        ];

        for (const index of indexes) {
            await this.run(index);
        }
    }

    // Promisify sqlite3 methods
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Helper method to generate unique work order number
    async generateWorkOrderNumber() {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const result = await this.get(
            'SELECT COUNT(*) as count FROM work_orders WHERE date = date("now")'
        );
        const dailyCount = (result?.count || 0) + 1;
        return `WO${today}${dailyCount.toString().padStart(3, '0')}`;
    }

    // Helper method to generate unique link
    generateUniqueLink() {
        const { v4: uuidv4 } = require('uuid');
        return uuidv4();
    }
}

module.exports = Database;