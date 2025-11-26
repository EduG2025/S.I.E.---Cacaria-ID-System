# 🚀 Guia de Implantação VPS - S.I.E. Cacaria

Este guia cobre a instalação, configuração e manutenção do sistema no servidor Linux (Ubuntu/Debian).

## 📍 Informações do Ambiente
*   **Diretório Raiz:** `/home/jennyai-admcacaria/htdocs/admcacaria.jennyai.space`
*   **Porta da Aplicação:** `3001`
*   **Banco de Dados:** MySQL (`siecacaria`)

---

## 1. Instalação Inicial

### Passo 1.1: Clonar Repositório
```bash
cd /home/jennyai-admcacaria/htdocs/admcacaria.jennyai.space
git clone https://github.com/EduG2025/S.I.E.---Cacaria-ID-System.git .
```

### Passo 1.2: Configurar Dependências
Instale as bibliotecas do Node.js:
```bash
npm install
```

### Passo 1.3: Configurar Ambiente (.env)
Crie o arquivo `.env`:
```bash
nano .env
```
Cole o conteúdo abaixo (ajuste a API KEY se necessário):
```env
PORT=3001
DB_HOST=127.0.0.1
DB_USER=siecacaria
DB_PASSWORD=Gegerminal180!
DB_NAME=siecacaria
API_KEY=AIzaSyA-hlJFnF9aO3nBkDbv9IQPd3UIE7d5SJs
```

### Passo 1.4: Configurar Banco de Dados
```bash
# Entre no MySQL
mysql -u root -p

# Execute os comandos:
CREATE DATABASE IF NOT EXISTS siecacaria;
CREATE USER IF NOT EXISTS 'siecacaria'@'127.0.0.1' IDENTIFIED BY 'Gegerminal180!';
GRANT ALL PRIVILEGES ON siecacaria.* TO 'siecacaria'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```
*O sistema criará as tabelas automaticamente na primeira execução.*

### Passo 1.5: Build e Execução
```bash
# Compilar o Frontend
npm run build

# Iniciar o Servidor (usando PM2 para manter online)
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 2. Atualização do Sistema (Deploy Contínuo)

Sempre que houver atualizações no GitHub, siga estes passos para atualizar o servidor:

```bash
cd /home/jennyai-admcacaria/htdocs/admcacaria.jennyai.space

# 1. Baixar código novo
git pull origin main

# 2. Atualizar dependências (caso tenha mudado algo)
npm install

# 3. Recompilar o Frontend (Obrigatório)
npm run build

# 4. Reiniciar o Servidor
pm2 restart sie-backend
```

---

## 3. Resolução de Problemas (Troubleshooting)

### Erro 502 Bad Gateway
O Nginx não consegue falar com o Node.js.
1. Verifique se o servidor está rodando: `pm2 status`
2. Veja os logs de erro: `pm2 logs sie-backend`
3. Reinicie o serviço: `pm2 restart all`

### Erro de Permissão (EACCES)
Garanta que o usuário do servidor web tenha acesso aos arquivos:
```bash
sudo chown -R $USER:www-data .
sudo chmod -R 755 .
```

### Banco de Dados não conecta
1. Verifique o `.env`.
2. Teste a conexão manual: `mysql -u siecacaria -h 127.0.0.1 -p`

### Erro Git: 'origin' does not appear
Se ao tentar atualizar você receber erro de repositório:
```bash
bash FIX_GIT.sh
```