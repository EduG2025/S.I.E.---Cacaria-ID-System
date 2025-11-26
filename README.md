# 🛡️ S.I.E. - Sistema de Investigação Estratégica (Módulo Cacaria)

**Versão:** 2.1.0 (Enterprise Edition)
**Status:** Produção Ativa

## 📖 Visão Geral

O **S.I.E. Cacaria** é uma plataforma integrada de gestão para a Associação de Moradores, combinando funcionalidades de ERP, CRM e Identificação Segura. O sistema utiliza Inteligência Artificial de ponta (Google Gemini) para automatizar processos burocráticos e garantir segurança de dados.

---

## 🚀 Funcionalidades Principais

### 1. 🆔 Central de Identificação (ID Generator)
*   **Geração de Carteirinhas:** Crie documentos físicos e digitais com layout profissional.
*   **IA Photo Studio:** Remove fundo, ajusta iluminação e enquadra fotos automaticamente.
*   **Editor Visual de Templates:** Interface "Drag-and-Drop" para criar novos modelos de carteirinha sem programação. Personalize fundo, cores, fontes e posição dos elementos.
*   **Exportação:** Salve em JPG de alta resolução (300 DPI) ou imprima diretamente.

### 2. 📂 Gestão de Cadastros (CRM)
*   **Banco de Dados Completo:** Armazene histórico, cargos e dados de contato.
*   **Scanner Inteligente:** Envie uma foto do RG/CNH e o sistema extrai os dados (OCR) automaticamente.
*   **Indicadores de Qualidade:** O sistema avisa quais cadastros estão incompletos ou sem foto.

### 3. ⚙️ Administração do Sistema
*   **Controle de Acesso:** Níveis de permissão para Administradores e Operadores.
*   **Configuração Global:** Defina CNPJ, Endereço e Diretoria uma única vez; todas as carteirinhas são atualizadas automaticamente.
*   **Busca Corporativa:** Digite o CNPJ e a IA busca Razão Social e Endereço na base da Receita/Google.

---

## 🛠️ Tecnologias Utilizadas

*   **Frontend:** React 18, TypeScript, Tailwind CSS, Vite.
*   **Backend:** Node.js, Express.
*   **Banco de Dados:** MySQL 8.0.
*   **AI Engine:** Google Gemini 2.5 Flash (Texto/Análise) & Gemini 3 Pro (Imagem/Geração).
*   **Infraestrutura:** PM2, Nginx, Linux (Ubuntu).

---

## 🔒 Acesso ao Sistema

### Credenciais Padrão (Primeiro Acesso)
*   **URL:** `https://admcacaria.jennyai.space`
*   **Usuário:** `admin`
*   **Senha:** `admin`

> ⚠️ **Importante:** Altere a senha e crie usuários nominais para os operadores imediatamente após a instalação.

---

## 📞 Suporte

Para suporte técnico ou reporte de bugs, entre em contato com o administrador do sistema ou consulte o arquivo `INSTALL_VPS.md` para procedimentos de manutenção.
