import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
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

// Rota de Saúde (Health Check) para Monitoramento
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Pool de conexão MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sie_cacaria_db',
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

        // 1. Residents Table (with Indexes for Performance)
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
        console.error("   Verifique as credenciais no arquivo .env");
    } finally {
        if (connection) connection.release();
    }
};

// Initialize DB on startup
initDB();

// --- ROTAS API ---

// 1. Auth (Simples)
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

// 2. Residents CRUD
app.get('/api/residents', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM residents ORDER BY name ASC');
        // Mapear snake_case do banco para camelCase do frontend
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
        console.error("Erro GET residents:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/residents', async (req, res) => {
    const r = req.body;
    try {
        // Upsert (Insert or Update)
        const sql = `
            INSERT INTO residents (id, name, role, cpf, rg, address, birth_date, registration_date, photo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            name=VALUES(name), role=VALUES(role), cpf=VALUES(cpf), rg=VALUES(rg), 
            address=VALUES(address), birth_date=VALUES(birth_date), photo_url=VALUES(photo_url)
        `;
        await pool.query(sql, [r.id, r.name, r.role, r.cpf, r.rg, r.address, r.birthDate, r.registrationDate, r.photoUrl]);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro POST residents:", err.message);
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

// 3. System Users CRUD
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, username, role FROM system_users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { id, name, username, password, role } = req.body;
    try {
        await pool.query(
            'INSERT INTO system_users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)',
            [id, name, username, password, role]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        if (req.params.id === '1') return res.status(403).json({ error: "Admin padrão não pode ser excluído" });
        await pool.query('DELETE FROM system_users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Association Settings
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM association_settings WHERE id = 1');
        if (rows.length > 0) {
            const settings = rows[0].data; // JSON column
            res.json({ data: settings, logo: rows[0].logo_base64 });
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
            `INSERT INTO association_settings (id, data, logo_base64) VALUES (1, ?, ?)
             ON DUPLICATE KEY UPDATE data=VALUES(data), logo_base64=VALUES(logo_base64)`,
            [JSON.stringify(data), logo]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
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
    const { name } = req.body;
    try {
        await pool.query('INSERT IGNORE INTO roles (name) VALUES (?)', [name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SERVING STATIC FRONTEND (VPS FALLBACK) ---
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
    // Serve os arquivos da pasta 'dist' gerados pelo build do React
    app.use(express.static(distPath));
    console.log(`📂 Servindo arquivos estáticos de: ${distPath}`);

    // Rota Catch-All para React Router
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    console.warn(`⚠️ Pasta 'dist' não encontrada em: ${distPath}`);
    console.warn("   Certifique-se de rodar 'npm run build' antes de iniciar o servidor em produção.");
    
    app.get('/', (req, res) => {
        res.send('<h1>API Online</h1><p>Frontend não encontrado. Execute npm run build.</p>');
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
