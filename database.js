const { QuickDB } = require("quick.db");
const db = new QuickDB({ filePath: './data/presencas.sqlite' });
module.exports = db;
