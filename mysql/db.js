const mysql = require('mysql');
const data = require('../data/data');
const db = mysql.createConnection(data.database);
db.connect();
db.query = require('util').promisify(db.query);
module.exports = db;