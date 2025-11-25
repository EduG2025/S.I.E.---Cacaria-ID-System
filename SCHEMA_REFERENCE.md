# Schema do Banco de Dados (MySQL)

Este documento serve como referência para a estrutura do banco de dados utilizada pelo **S.I.E. - Sistema de Investigação Estratégica**.

Para instalar, você pode copiar o código abaixo e executar no seu cliente MySQL ou importar o arquivo `schema.sql`.

```sql
CREATE DATABASE IF NOT EXISTS sie_cacaria_db;
USE sie_cacaria_db;

-- --------------------------------------------------------
-- Tabela de Moradores (Residents)
-- Armazena os dados cadastrais e a foto em Base64
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS residents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    role VARCHAR(100),
    cpf VARCHAR(20),
    rg VARCHAR(20),
    address TEXT,
    birth_date VARCHAR(20),
    registration_date VARCHAR(20),
    photo_url LONGTEXT, -- LONGTEXT é essencial para armazenar imagens Base64 grandes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Tabela de Usuários do Sistema (Auth)
-- Controle de acesso para Admins e Operadores
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Nota: Em produção real, recomenda-se hash
    role ENUM('ADMIN', 'OPERADOR') DEFAULT 'OPERADOR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Tabela de Configurações da Associação
-- Tabela Singleton (sempre ID=1) para guardar configurações globais
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS association_settings (
    id INT PRIMARY KEY, -- Sempre será 1
    data JSON, -- Armazena toda a estrutura hierárquica (diretoria, endereço, contatos)
    logo_base64 LONGTEXT, -- Logo oficial da associação
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Tabela de Cargos (Roles)
-- Usada para popular o autocomplete do formulário
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- --------------------------------------------------------
-- DADOS INICIAIS (SEEDS)
-- --------------------------------------------------------

-- 1. Usuário Admin Padrão (Login: admin / Senha: admin)
INSERT IGNORE INTO system_users (id, name, username, password, role) 
VALUES ('1', 'Administrador', 'admin', 'admin', 'ADMIN');

-- 2. Cargos Padrão do Sistema
INSERT IGNORE INTO roles (name) VALUES 
('Morador'), 
('Presidente'), 
('Vice-Presidente'), 
('Tesoureiro'), 
('Secretário'), 
('Diretor');
```