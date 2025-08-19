const mysql = require('mysql');
const data = require('../data/data');
const Log = require('../logs');

// Create a mock database for demo purposes if connection fails
const mockDb = {
    query: async (sql, params) => {
        Log.debug("database", `Mock query: ${sql} with params: ${JSON.stringify(params)}`);
        
        // Return mock data based on query type
        if (sql.includes('SELECT * FROM users WHERE id = ?')) {
            return [{ id: 1, name: 'Demo User', username: 'demo', email: 'demo@example.com', avatar: '/img/default_avatar.png', status: 'online' }];
        }
        if (sql.includes('SELECT * FROM ai_history')) {
            return []; // Return empty array for AI history
        }
        if (sql.includes('UPDATE users SET status')) {
            return { affectedRows: 1 };
        }
        
        return []; // Default return
    },
    connect: (callback) => {
        Log.info("database", "Using mock database for demo purposes");
        if (callback) callback();
    }
};

let db;

try {
    db = mysql.createConnection(data.database);
    
    // Try to connect with error handling
    db.connect((err) => {
        if (err) {
            Log.warn("database", "MySQL connection failed, using mock database for demo");
            db = mockDb;
        } else {
            Log.success("database", "Connected to MySQL database successfully");
            db.query = require('util').promisify(db.query);
        }
    });
} catch (error) {
    Log.warn("database", "MySQL connection failed, using mock database for demo");
    db = mockDb;
}

module.exports = db;