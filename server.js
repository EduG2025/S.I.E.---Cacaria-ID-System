
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.get('/health', (req, res) => { res.status(200).send('OK'); });
app.use(express.static(path.join(__dirname, 'dist')));

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'siecacaria',
    password: process.env.DB_PASSWORD || 'Gegerminal180!',
    database: process.env.DB_NAME || 'siecacaria',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true, // FIX: Prevent connection loss
    keepAliveInitialDelay: 0
});

// --- INIT DB ---
const initDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log("✅ MySQL Connected");
        await connection.query(`CREATE TABLE IF NOT EXISTS residents (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, role VARCHAR(100), cpf VARCHAR(20), rg VARCHAR(20), address TEXT, birth_date VARCHAR(20), registration_date VARCHAR(20), photo_url LONGTEXT)`);
        await connection.query(`CREATE TABLE IF NOT EXISTS system_users (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255), username VARCHAR(50) UNIQUE, password VARCHAR(255), role VARCHAR(20))`);
        await connection.query(`CREATE TABLE IF NOT EXISTS association_settings (id INT PRIMARY KEY, data JSON, logo_base64 LONGTEXT)`);
        await connection.query(`CREATE TABLE IF NOT EXISTS roles (name VARCHAR(100) PRIMARY KEY)`);
        await connection.query(`CREATE TABLE IF NOT EXISTS id_card_templates (id VARCHAR(36) PRIMARY KEY, name VARCHAR(100), background_url LONGTEXT, elements JSON, width INT, height INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await connection.query(`CREATE TABLE IF NOT EXISTS api_keys (id VARCHAR(36) PRIMARY KEY, label VARCHAR(100), key_value VARCHAR(255), is_active BOOLEAN, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        // Seeds
        await connection.query(`INSERT IGNORE INTO system_users (id, name, username, password, role) VALUES ('1', 'Admin', 'admin', 'admin', 'ADMIN')`);
        if(process.env.API_KEY) await connection.query(`INSERT IGNORE INTO api_keys (id, label, key_value, is_active) VALUES ('seed', 'Env Key', ?, 1)`, [process.env.API_KEY]);
        
        connection.release();
    } catch (err) { console.error("DB Init Error:", err); }
};
initDB();

// --- ROUTES ---
app.post('/api/login', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM system_users WHERE username = ? AND password = ?', [req.body.username, req.body.password]);
        rows.length > 0 ? res.json(rows[0]) : res.status(401).json({ error: 'Invalid' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Residents
app.get('/api/residents', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM residents'); res.json(rows.map(r => ({id: r.id, name: r.name, role: r.role, cpf: r.cpf, rg: r.rg, address: r.address, birthDate: r.birth_date, registrationDate: r.registration_date, photoUrl: r.photo_url}))); } catch (err) { res.status(500).send(err); }
});
app.post('/api/residents', async (req, res) => {
    const r = req.body;
    try { await pool.query(`INSERT INTO residents (id, name, role, cpf, rg, address, birth_date, registration_date, photo_url) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=?, role=?, cpf=?, rg=?, address=?, birth_date=?, registration_date=?, photo_url=?`, 
    [r.id, r.name, r.role, r.cpf, r.rg, r.address, r.birthDate, r.registrationDate, r.photoUrl, r.name, r.role, r.cpf, r.rg, r.address, r.birthDate, r.registrationDate, r.photoUrl]); res.json({success: true}); } catch (err) { res.status(500).send(err); }
});
app.delete('/api/residents/:id', async(req,res) => { await pool.query('DELETE FROM residents WHERE id=?', [req.params.id]); res.json({success:true}); });

// Settings
app.get('/api/settings', async(req,res) => { const [rows] = await pool.query('SELECT * FROM association_settings WHERE id=1'); res.json(rows[0] ? {data: rows[0].data, logo: rows[0].logo_base64} : {data:null, logo:null}); });
app.post('/api/settings', async(req,res) => { await pool.query('INSERT INTO association_settings (id, data, logo_base64) VALUES (1,?,?) ON DUPLICATE KEY UPDATE data=?, logo_base64=?', [JSON.stringify(req.body.data), req.body.logo, JSON.stringify(req.body.data), req.body.logo]); res.json({success:true}); });

// Keys
app.get('/api/keys/active', async(req,res) => { 
    const [rows] = await pool.query('SELECT key_value FROM api_keys WHERE is_active=1 LIMIT 1');
    res.json({key: rows[0]?.key_value || process.env.API_KEY});
});
app.get('/api/keys', async(req,res) => { const [rows] = await pool.query('SELECT id, label, is_active FROM api_keys'); res.json(rows); });
app.post('/api/keys', async(req,res) => { if(req.body.isActive) await pool.query('UPDATE api_keys SET is_active=0'); await pool.query('INSERT INTO api_keys (id, label, key_value, is_active) VALUES (?,?,?,?)', [req.body.id, req.body.label, req.body.key, req.body.isActive]); res.json({success:true}); });
app.delete('/api/keys/:id', async(req,res) => { await pool.query('DELETE FROM api_keys WHERE id=?',[req.params.id]); res.json({success:true}); });

// Roles & Templates
app.get('/api/roles', async(req,res) => { const [rows] = await pool.query('SELECT name FROM roles'); res.json(rows.map(r=>r.name)); });
app.post('/api/roles', async(req,res) => { await pool.query('INSERT IGNORE INTO roles (name) VALUES (?)', [req.body.name]); res.json({success:true}); });
app.get('/api/templates', async(req,res) => { const [rows] = await pool.query('SELECT * FROM id_card_templates'); res.json(rows.map(t=>({...t, backgroundUrl: t.background_url, createdAt: t.created_at}))); });
app.post('/api/templates', async(req,res) => { const t=req.body; await pool.query('INSERT INTO id_card_templates (id,name,background_url,elements,width,height) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=?, background_url=?, elements=?', [t.id,t.name,t.backgroundUrl,JSON.stringify(t.elements),t.width,t.height, t.name,t.backgroundUrl,JSON.stringify(t.elements)]); res.json({success:true}); });

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));
