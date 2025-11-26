import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do CORS para permitir requisições do Frontend
app.use(cors());
// Aumentar limite para suportar imagens Base64 grandes
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Rota de Saúde (Health Check)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Servir arquivos estáticos do React (Frontend)
app.use(express.static(path.join(__dirname, 'dist')));

// Pool de conexão MySQL
// Atualizado com os padrões de produção solicitados
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'siecacaria',
    password: process.env.DB_PASSWORD || 'Gegerminal180!',
    database: process.env.DB_NAME || 'siecacaria',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- AUTOMATIC DATABASE MIGRATION & SEEDING ---
const initDB = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log("✅ Conectado ao MySQL com sucesso!");
        
        await connection.beginTransaction();

        // 1. Residents Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS residents (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(100),
                cpf VARCHAR(20),
                rg VARCHAR(20),
                address TEXT,
                birth_date VARCHAR(20),
                registration_date VARCHAR(20),
                photo_url LONGTEXT,
                INDEX idx_name (name),
                INDEX idx_cpf (cpf),
                INDEX idx_role (role)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);

        // 2. System Users Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_users (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);

        // 3. Association Settings Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS association_settings (
                id INT PRIMARY KEY,
                data JSON,
                logo_base64 LONGTEXT
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);

        // 4. Roles Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS roles (
                name VARCHAR(100) PRIMARY KEY
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);

        // 5. Custom Templates Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS id_card_templates (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                background_url LONGTEXT,
                elements JSON,
                width INT DEFAULT 350,
                height INT DEFAULT 220,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);

        // Seed Default Admin User
        const [users] = await connection.query('SELECT * FROM system_users WHERE username = ?', ['admin']);
        if (users.length === 0) {
            await connection.query(
                'INSERT INTO system_users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)', 
                ['1', 'Administrador', 'admin', 'admin', 'ADMIN']
            );
            console.log("⚠️ Usuário Admin criado (admin/admin)");
        }

        await connection.commit();
        console.log("✅ Banco de Dados inicializado e otimizado.");

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("❌ Erro na inicialização do Banco de Dados:", err.message);
    } finally {
        if (connection) connection.release();
    }
};

initDB();

// --- API ROUTES ---

// 1. Auth
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM system_users WHERE username = ? AND password = ?', 
            [username, password]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Residents
app.get('/api/residents', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM residents ORDER BY name ASC');
        const residents = rows.map(r => ({
            id: r.id,
            name: r.name,
            role: r.role,
            cpf: r.cpf,
            rg: r.rg,
            address: r.address,
            birthDate: r.birth_date,
            registrationDate: r.registration_date,
            photoUrl: r.photo_url
        }));
        res.json(residents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/residents', async (req, res) => {
    const r = req.body;
    try {
        await pool.query(
            `INSERT INTO residents (id, name, role, cpf, rg, address, birth_date, registration_date, photo_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=?, role=?, cpf=?, rg=?, address=?, birth_date=?, registration_date=?, photo_url=?`,
            [r.id, r.name, r.role, r.cpf, r.rg, r.address, r.birthDate, r.registrationDate, r.photoUrl,
             r.name, r.role, r.cpf, r.rg, r.address, r.birthDate, r.registrationDate, r.photoUrl]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/residents/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM residents WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, username, role FROM system_users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        await pool.query(
            'INSERT INTO system_users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)',
            [u.id, u.name, u.username, u.password, u.role]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM system_users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Settings
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM association_settings WHERE id = 1');
        if (rows.length > 0) {
            res.json({ data: rows[0].data, logo: rows[0].logo_base64 });
        } else {
            res.json({ data: null, logo: null });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    const { data, logo } = req.body;
    try {
        await pool.query(
            'INSERT INTO association_settings (id, data, logo_base64) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE data=?, logo_base64=?',
            [JSON.stringify(data), logo, JSON.stringify(data), logo]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Roles
app.get('/api/roles', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT name FROM roles');
        res.json(rows.map(r => r.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/roles', async (req, res) => {
    try {
        await pool.query('INSERT IGNORE INTO roles (name) VALUES (?)', [req.body.name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Templates (NEW)
app.get('/api/templates', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM id_card_templates ORDER BY created_at DESC');
        res.json(rows.map(t => ({
            id: t.id,
            name: t.name,
            backgroundUrl: t.background_url,
            elements: t.elements, // MySQL JSON type is auto parsed by driver usually, if not we parse
            width: t.width,
            height: t.height,
            createdAt: t.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/templates', async (req, res) => {
    const t = req.body;
    try {
        await pool.query(
            `INSERT INTO id_card_templates (id, name, background_url, elements, width, height) 
             VALUES (?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE name=?, background_url=?, elements=?, width=?, height=?`,
            [t.id, t.name, t.backgroundUrl, JSON.stringify(t.elements), t.width, t.height,
             t.name, t.backgroundUrl, JSON.stringify(t.elements), t.width, t.height]
        );
        res.json({ success: true });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/templates/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM id_card_templates WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback para React Router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
