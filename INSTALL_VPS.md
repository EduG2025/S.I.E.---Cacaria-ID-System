# Guia de Instalação: S.I.E. Cacaria (VPS + MySQL)

Este guia descreve o processo passo a passo para implantar o Sistema de Investigação Estratégica (Módulo Cacaria) no seu servidor VPS.

## Pré-requisitos
*   Servidor VPS configurado.
*   Acesso SSH.
*   Caminho de instalação: `/home/jennyai-admcacaria/htdocs/admcacaria.jennyai.space`

---

## Passo 1: Preparação do Ambiente (Sistema Operacional)

Atualize os pacotes do servidor:
```bash
sudo apt update && sudo apt upgrade -y
```

Instale as dependências básicas:
```bash
sudo apt install curl git build-essential -y
```

---

## Passo 2: Instalar e Configurar o MySQL

1.  Instale o servidor MySQL:
    ```bash
    sudo apt install mysql-server -y
    ```

2.  Acesse o shell do MySQL:
    ```bash
    sudo mysql -u root -p
    ```

3.  Crie o banco de dados e usuário (Atualizado para **siecacaria**):
    ```sql
    CREATE DATABASE siecacaria;
    CREATE USER 'siecacaria'@'localhost' IDENTIFIED BY 'SuaSenhaForteAqui';
    GRANT ALL PRIVILEGES ON siecacaria.* TO 'siecacaria'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;
    ```

4.  Importe o schema inicial (após clonar o projeto no Passo 4):
    ```bash
    mysql -u siecacaria -p siecacaria < schema.sql
    ```

---

## Passo 3: Instalar Node.js e PM2

1.  Instale o Node.js (versão 18 LTS ou 20):
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    ```

2.  Instale o PM2 (Gerenciador de Processos):
    ```bash
    sudo npm install -g pm2
    ```

---

## Passo 4: Instalação da Aplicação

1.  Navegue até a pasta do seu site e clone o repositório:
    ```bash
    cd /home/jennyai-admcacaria/htdocs/admcacaria.jennyai.space
    
    # Se a pasta não estiver vazia, mova arquivos temporariamente ou use '.' no final
    git clone https://github.com/EduG2025/S.I.E.---Cacaria-ID-System.git .
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  Configure as variáveis de ambiente:
    Crie ou edite o arquivo `.env`:
    ```bash
    nano .env
    ```
    **Conteúdo Atualizado:**
    ```env
    PORT=3001
    DB_HOST=localhost
    DB_USER=siecacaria
    DB_PASSWORD=SuaSenhaForteAqui
    DB_NAME=siecacaria
    API_KEY=SUA_CHAVE_GOOGLE_GEMINI
    ```

4.  Build do Frontend (React):
    ```bash
    npm run build
    ```

---

## Passo 5: Configurar o Nginx

Edite o arquivo de configuração do seu site no Nginx (geralmente em `/etc/nginx/conf.d/` ou gerenciado pelo painel):

```nginx
server {
    listen 80;
    server_name admcacaria.jennyai.space;

    # Backend API Proxy
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```

---

## Passo 6: Iniciar o Backend

1.  Inicie o servidor com PM2:
    ```bash
    pm2 start ecosystem.config.cjs
    ```

2.  Salvar configuração para reiniciar no boot:
    ```bash
    pm2 save
    pm2 startup
    ```

O sistema estará acessível em `https://admcacaria.jennyai.space`.