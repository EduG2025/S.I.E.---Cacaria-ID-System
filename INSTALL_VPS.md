# Guia de Instalação: S.I.E. Cacaria (VPS + MySQL)

Este guia descreve o processo passo a passo para implantar o Sistema de Investigação Estratégica (Módulo Cacaria) em um servidor VPS Linux (Ubuntu 20.04/22.04) com banco de dados MySQL.

## Pré-requisitos
*   Um servidor VPS com Ubuntu instalado.
*   Acesso SSH root ou sudo.
*   Um domínio apontado para o IP do servidor (opcional, mas recomendado).

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

2.  Inicie o script de segurança (defina a senha de root do banco):
    ```bash
    sudo mysql_secure_installation
    ```

3.  Crie o banco de dados e usuário para o sistema:
    ```bash
    sudo mysql -u root -p
    ```

    Dentro do shell do MySQL, execute:
    ```sql
    CREATE DATABASE sie_cacaria_db;
    CREATE USER 'sie_user'@'localhost' IDENTIFIED BY 'SuaSenhaForteAqui';
    GRANT ALL PRIVILEGES ON sie_cacaria_db.* TO 'sie_user'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;
    ```

4.  Importe o schema inicial:
    Assumindo que você já clonou o projeto (ver passo 4), navegue até a pasta e execute:
    ```bash
    mysql -u sie_user -p sie_cacaria_db < schema.sql
    ```

---

## Passo 3: Instalar Node.js e PM2

1.  Instale o Node.js (versão 18 LTS):
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    ```

2.  Instale o PM2 (Gerenciador de Processos para manter o backend rodando):
    ```bash
    sudo npm install -g pm2
    ```

---

## Passo 4: Configuração da Aplicação

1.  Clone o repositório no diretório `/var/www`:
    ```bash
    cd /var/www
    sudo git clone https://github.com/seu-repo/sie-system.git sie-system
    cd sie-system
    ```

2.  Instale as dependências (Frontend e Backend):
    ```bash
    npm install
    ```
    *Nota: Se o backend estiver em pasta separada, navegue até ela e instale também.*

3.  Configure as variáveis de ambiente:
    Crie um arquivo `.env` na raiz:
    ```bash
    nano .env
    ```
    Conteúdo:
    ```env
    PORT=3001
    DB_HOST=localhost
    DB_USER=sie_user
    DB_PASSWORD=SuaSenhaForteAqui
    DB_NAME=sie_cacaria_db
    API_KEY=SUA_CHAVE_GOOGLE_GEMINI
    ```

4.  Build do Frontend (React):
    ```bash
    npm run build
    ```
    Isso criará uma pasta `dist` ou `build` com os arquivos estáticos.

---

## Passo 5: Configurar o Nginx (Proxy Reverso)

O Nginx servirá o Frontend estático e encaminhará as chamadas de API para o Node.js.

1.  Instale o Nginx:
    ```bash
    sudo apt install nginx -y
    ```

2.  Crie a configuração do site:
    ```bash
    sudo nano /etc/nginx/sites-available/sie-system
    ```

    Conteúdo:
    ```nginx
    server {
        listen 80;
        server_name seu-dominio.com ou_seu_IP;

        root /var/www/sie-system/dist; # Pasta gerada pelo npm run build
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # Rota para a API (Backend Node.js)
        location /api/ {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            
            # Aumentar limite de upload para imagens Base64
            client_max_body_size 50M;
        }
    }
    ```

3.  Ative o site e reinicie o Nginx:
    ```bash
    sudo ln -s /etc/nginx/sites-available/sie-system /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    ```

---

## Passo 6: Iniciar o Backend

1.  Inicie o servidor com PM2:
    ```bash
    pm2 start server.js --name "sie-backend"
    ```

2.  Configure o PM2 para iniciar no boot:
    ```bash
    pm2 startup
    pm2 save
    ```

---

## Passo 7: Finalização e SSL

1.  Se tiver um domínio, instale o Certbot para HTTPS gratuito:
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d seu-dominio.com
    ```

Agora o sistema está acessível pelo navegador!
