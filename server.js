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
    database: process.env.DB_NAME || 'siecacaria', // Atualizado para o novo padrão
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
            photoUrl