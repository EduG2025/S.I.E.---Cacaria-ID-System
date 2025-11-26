# 🗄️ Schema do Banco de Dados (MySQL) - S.I.E. Cacaria

Este documento contém a definição oficial da estrutura do banco de dados. Use este script para criar ou restaurar o banco de dados no servidor VPS.

## 📋 Informações de Conexão (Produção)
*   **Database:** `siecacaria`
*   **User:** `siecacaria`
*   **Host:** `127.0.0.1`

---

## 🚀 Script SQL Completo

Copie e execute o código abaixo no seu cliente MySQL (Workbench, DBeaver ou Terminal):

```sql
-- 1. Criação e Seleção do Banco
CREATE DATABASE IF NOT EXISTS siecacaria;
USE siecacaria;

-- --------------------------------------------------------
-- Tabela: residents (Moradores)
-- Armazena dados pessoais e foto de perfil
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS residents (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    cpf VARCHAR(20),
    rg VARCHAR(20),
    address TEXT,
    birth_date VARCHAR(20),
    registration_date VARCHAR(20),
    photo_url LONGTEXT, -- Armazena Base64 (pode ser grande)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_cpf (cpf)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabela: system_users (Autenticação)
-- Usuários que podem acessar o sistema administrativo
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Em produção, usar hash (bcrypt)
    role ENUM('ADMIN', 'OPERADOR') DEFAULT 'OPERADOR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabela: association_settings (Configuração Global)
-- Armazena dados da associação (CNPJ, Endereço, Diretoria) e Logo
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS association_settings (
    id INT PRIMARY KEY, -- Sempre 1
    data JSON, -- JSON estruturado com endereço, contatos e diretoria
    logo_base64 LONGTEXT, -- Logo oficial em alta resolução
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabela: roles (Cargos Dinâmicos)
-- Lista para o autocomplete do formulário
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    name VARCHAR(100) PRIMARY KEY
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabela: id_card_templates (Templates Personalizados)
-- Layouts criados pelo Editor Visual
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS id_card_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    background_url LONGTEXT,
    elements JSON, -- Array de elementos visuais (x, y, cor, fonte)
    width INT DEFAULT 350,
    height INT DEFAULT 220,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- SEEDS (Dados Iniciais)
-- --------------------------------------------------------

-- 1. Usuário Admin Padrão
-- Login: admin
-- Senha: admin
INSERT IGNORE INTO system_users (id, name, username, password, role) 
VALUES ('1', 'Administrador', 'admin', 'admin', 'ADMIN');

-- 2. Cargos Iniciais
INSERT IGNORE INTO roles (name) VALUES 
('Morador'), 
('Presidente'), 
('Vice-Presidente'), 
('Tesoureiro'), 
('Secretário'), 
('Diretor'),
('Conselheiro');

```