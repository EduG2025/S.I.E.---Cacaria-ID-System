# 🛡️ S.I.E. - Sistema de Investigação Estratégica (Módulo Cacaria)

**Versão:** 2.0.0 (Enterprise)  
**Status:** Produção  
**Tecnologia IA:** Google Gemini 2.5 Active & Gemini 3 Pro

## 📖 Sobre o Projeto

O **S.I.E. (Cacaria ID System)** é uma plataforma web completa do tipo ERP (Enterprise Resource Planning) desenvolvida para a gestão moderna de Associações de Moradores. 

O sistema vai além de um simples cadastro, integrando **Inteligência Artificial (Google Gemini)** para automatizar tarefas complexas como:
*   Leitura e extração de dados de documentos (RG/CNH) via OCR.
*   Edição e tratamento de fotos para documentos oficiais (remoção de fundo, iluminação).
*   Busca automática de dados de empresas (CNPJ) e endereços.
*   Geração visual de Carteirinhas de Identificação com layouts profissionais.

## 🚀 Funcionalidades Principais

### 1. 🔐 Controle de Acesso e Segurança
*   Login com níveis de permissão (**Admin** e **Operador**).
*   Gestão de usuários do sistema (CRUD).

### 2. 🪪 Central de Identificação (ID Generator)
*   **Estúdio Fotográfico IA:** Upload de foto crua com tratamento automático (fundo branco, enquadramento).
*   **Templates Dinâmicos:** Escolha entre designs *Clássico*, *Moderno* e *Minimalista*.
*   **Edição Direta:** Clique na carteirinha para editar textos em tempo real.
*   **Marca D'água:** Aplicação automática da logo da associação.
*   **Exportação:** Impressão direta ou download em JPG de alta resolução.

### 3. 📝 Gestão de Cadastros
*   Banco de dados local persistente de moradores.
*   Indicadores visuais de pendências de cadastro.
*   Filtros inteligentes (Nome, CPF, Pendentes).

### 4. 🏢 Configuração do Sistema (Admin)
*   Cadastro dinâmico de dados da Associação.
*   **Busca de CNPJ:** Preenchimento automático de Razão Social e Endereço via IA.
*   Gestão de Diretoria e Mandatos.
*   Upload de Logo Oficial e Atas de Eleição (PDF).

---

## 🛠️ Stack Tecnológica

*   **Frontend:** React 19, TypeScript
*   **Estilização:** Tailwind CSS (Design System responsivo)
*   **Inteligência Artificial:** Google GenAI SDK (`@google/genai`)
    *   *Gemini 2.5 Flash:* OCR e Análise de Texto.
    *   *Gemini 2.5 Flash Image:* Edição e tratamento de imagem.
    *   *Gemini 3 Pro:* Análise profunda e geração.
*   **Utilitários:** `html2canvas` (Geração de Imagens), `lucide-react` (Ícones).

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:

*   [Node.js](https://nodejs.org/) (Versão 18 ou superior)
*   Gerenciador de pacotes `npm` ou `yarn`.
*   Uma chave de API do **Google AI Studio** (Gemini API).

---

## ⚙️ Instalação e Configuração

Siga os passos abaixo para rodar o projeto localmente:

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/sie-cacaria-system.git
cd sie-cacaria-system
```

### 2. Instalar Dependências

```bash
npm install
# ou
yarn install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo na raiz do projeto para armazenar sua chave de API. Dependendo do seu bundler (Vite, Webpack), a configuração pode variar.

*Nota: Este projeto foi configurado para ler `process.env.API_KEY`.*

**Linux/Mac (Terminal):**
```bash
export API_KEY="sua_chave_gemini_aqui"
```

**Windows (Powershell):**
```powershell
$env:API_KEY="sua_chave_gemini_aqui"
```

### 4. Executar o Projeto

```bash
npm start
# ou
npm run dev
```

O sistema estará acessível em `http://localhost:3000` (ou a porta definida pelo seu terminal).

---

## 📖 Guia de Uso Rápido

### Acesso Inicial
*   **Usuário:** `admin`
*   **Senha:** `admin`

### Passo 1: Configurar Associação
1.  Acesse o menu lateral **Sistema** (ícone Prédio).
2.  Faça o upload da **Logo Oficial**.
3.  Preencha o CNPJ e clique na **Lupa** para buscar dados automáticos.
4.  Defina a Diretoria e as datas do Mandato.
5.  Clique em **Salvar Configurações**.

### Passo 2: Cadastrar Morador
1.  Vá para **Editor de ID**.
2.  Use o **Scanner** (ícone nuvem) para carregar uma foto de RG/CNH. A IA preencherá os dados.
3.  Carregue uma foto de rosto no **Estúdio Fotográfico IA**.
4.  Use o botão "Aplicar Edição (IA)" para tratar a foto.
5.  Clique em **Salvar Cadastro**.

### Passo 3: Emitir Carteirinha
1.  Ainda no **Editor de ID**, selecione o modelo visual desejado (Classic, Modern, Minimal).
2.  Use os sliders de **Zoom** para ajustar a foto.
3.  Clique em **Imprimir** ou **Salvar JPG**.

---

## ⚠️ Solução de Problemas

**Erro: "Requested entity was not found" (404)**
*   Verifique se sua API KEY é válida.
*   Certifique-se de que o modelo de IA chamado no código (`gemini-2.5-flash`, etc.) está disponível para sua chave de API.

**Erro de Armazenamento (Quota Exceeded)**
*   O sistema usa `localStorage`. Se você salvar muitos PDFs grandes (Atas), o navegador pode bloquear. Tente salvar arquivos menores ou limpar o cache.

---

## 📄 Licença

Este projeto é proprietário e desenvolvido para uso exclusivo da Associação de Moradores de Cacaria.
