const db = require("./db");

// Users table
db.query("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL , password VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, avatar VARCHAR(255) NOT NULL DEFAULT '/img/default_avatar.png', admin BOOLEAN NOT NULL, status VARCHAR(255) NOT NULL DEFAULT 'offline', hidden BOOLEAN NOT NULL DEFAULT 0, UNIQUE (username, email))");

// Messages table with optimized indexes
db.query(`CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    users_id TEXT NOT NULL,
    frontend_msg_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (target_id, user_id, created_at),
    INDEX idx_user_messages (user_id, created_at)
)`);

// AI history table
db.query("CREATE TABLE IF NOT EXISTS ai_history (id INT PRIMARY KEY AUTO_INCREMENT, content TEXT NOT NULL, uid INT NOT NULL, FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE)");

// Trash logs table
db.query("CREATE TABLE IF NOT EXISTS trash_logs (id INT PRIMARY KEY AUTO_INCREMENT, uid INT(255) NOT NULL, data TEXT NOT NULL, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP , FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE)");

// Trash stats table
db.query("CREATE TABLE IF NOT EXISTS trash_stats (uid INT(255) NOT NULL, data TEXT NOT NULL, FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE)");