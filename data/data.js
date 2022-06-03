const data = {
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    },
    server: {
        port: process.env.PORT,
        encryptionKey: process.env.ENCRYPTION_KEY,
        sessionSecret: process.env.SESSION_SECRET,
    },
}
module.exports = data;