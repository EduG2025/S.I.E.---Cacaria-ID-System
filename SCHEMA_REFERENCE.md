# 🗄️ Schema do Banco de Dados (MySQL) - S.I.E. Cacaria

Este documento contém a estrutura oficial e definitiva do banco de dados para o sistema S.I.E. Cacaria (Versão 2.1.0).
Utilize este script para criar, restaurar ou migrar o banco de dados no servidor VPS.

## 📋 Informações de Conexão (Produção)
*   **Database:** `siecacaria`
*   **User:** `siecacaria`
*   **Password:** `Gegerminal180!`
*   **Host:** `127.0.0.1`

---

## 🚀 Script SQL Completo

Copie e execute o código abaixo no seu cliente MySQL (Workbench, DBeaver ou Terminal do servidor):

```sql
-- 1. Criação e Seleção do Banco de Dados
CREATE DATABASE IF NOT EXISTS siecacaria;
USE siecacaria;

-- --------------------------------------------------------
-- Tabela: residents (Cadastros de Moradores)
-- Armazena os dados pessoais e a foto de perfil.
-- A coluna 'photo_url' é LONGTEXT para suportar imagens em Base64.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS residents (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    cpf VARCHAR(20),
    rg VARCHAR(20),
    address TEXT,
    birth_date VARCHAR(20),       -- Formato: DD/MM/AAAA
    registration_date VARCHAR(20), -- Formato: DD/MM/AAAA
    photo_url LONGTEXT,           -- Imagem do residente (Base64)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_cpf (cpf),
    INDEX idx_role (role)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabela: system_users (Usuários do Sistema)
-- Controle de acesso para Administradores e Operadores.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Senha simples ou hash
    role VARCHAR(20) NOT NULL,      -- 'ADMIN' ou 'OPERADOR'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabela: association_settings (Configuração Global)
-- Tabela de registro único (ID=1) contendo:
-- 1. Dados da Associação (CNPJ, Endereço, Diretoria, PDF da Ata) em JSON.
-- 2. Logotipo Oficial em alta resolução (Base64) em LONGTEXT.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS association_settings (
    id INT PRIMARY KEY,
    data JSON,             -- Armazena estrutura completa: { nome, cnpj, address: {}, management: { electionMinutesPdf: "base64..." } }
    logo_base64 LONGTEXT,  -- Imagem do Logotipo Oficial
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabela: roles (Lista de Cargos)
-- Usada para o autocomplete no formulário de cadastro.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    name VARCHAR(100) PRIMARY KEY
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabela: id_card_templates (Editor Visual)
-- Salva os layouts personalizados criados pelo usuário.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS id_card_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    background_url LONGTEXT, -- Imagem de fundo do template (Base64)
    elements JSON,           -- Array de objetos visuais (posição x, y, fonte, cor)
    width INT DEFAULT 350,
    height INT DEFAULT 220,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabela: api_keys (Gestão Google Gemini)
-- Armazena as chaves de API para uso dinâmico pelo sistema.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(36) PRIMARY KEY,
    label VARCHAR(100),          -- Nome descritivo (ex: "Chave Pessoal")
    key_value VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- DADOS INICIAIS (Seeds)
-- Execute para popular o sistema com dados padrão
-- --------------------------------------------------------

-- 1. Usuário Administrador Padrão
INSERT IGNORE INTO system_users (id, name, username, password, role) 
VALUES ('1', 'Administrador do Sistema', 'admin', 'admin', 'ADMIN');

-- 2. Cargos Iniciais Padrão
INSERT IGNORE INTO roles (name) VALUES 
('Morador'), 
('Presidente'), 
('Vice-Presidente'), 
('Tesoureiro'), 
('Secretário'), 
('Diretor'),
('Conselheiro'),
('Sócio Benemérito');

```