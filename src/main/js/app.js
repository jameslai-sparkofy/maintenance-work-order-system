const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');

const workOrderRoutes = require('./api/workOrderRoutes');
const viewRoutes = require('./api/viewRoutes');
const Database = require('./core/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();
db.init().then(() => {
    console.log('✅ Database initialized successfully');
}).catch(err => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'maintenance-work-order-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - with path logging for debugging
const staticPath = path.join(__dirname, '../resources/assets');
const uploadsPath = path.join(__dirname, '../../../output/uploads');
console.log('Static files path:', staticPath);
console.log('Uploads path:', uploadsPath);

app.use('/static', express.static(staticPath));
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/work-orders', workOrderRoutes);
app.use('/', viewRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Maintenance Work Order System running on port ${PORT}`);
    console.log(`📋 Access: http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});