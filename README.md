# Trabalho-microservicos
# Smart Lockers Backend - Arquitetura de Microsserviços

Este projeto consiste no backend de um sistema de armários inteligentes (Smart Lockers) para entrega de encomendas em condomínios. Desenvolvido como atividade acadêmica para a disciplina de Desenvolvimento de sistemas moveis e embarcados(UFSC), o sistema adota uma **Arquitetura de Microsserviços** utilizando Node.js, com comunicação síncrona via REST e comunicação assíncrona orientada a eventos via mensageria.

## Arquitetura do Sistema

O ecossistema é composto por um **API Gateway** e 5 microsserviços independentes. Para garantir o baixo acoplamento, cada microsserviço de persistência possui seu próprio banco de dados isolado (SQLite).

1. **API Gateway (Porta 3000):** Ponto de entrada único. Roteia as requisições HTTP para os serviços internos adequados.
2. **Cadastro de Lockers (Porta 3001):** Gerencia os armários físicos e seus compartimentos (`lockers.db`).
3. **Cadastro de Condôminos (Porta 3002):** Gerencia os moradores que podem receber encomendas (`condominos.db`).
4. **Controle de Entregas (Porta 3003):** O "cérebro" do sistema. Valida dados via Axios (REST) e publica eventos de mensageria (`entregas.db`).
5. **Serviço de Logging (Porta 3004):** Serviço consumidor que ouve eventos assíncronos e salva o histórico de auditoria (`logging.db`).
6. **Controle de Abertura:** Serviço *worker* que escuta comandos de abertura de portas e simula o acionamento do hardware via terminal.

### Fluxo de Comunicação
* **Síncrona (REST/Axios):** Validações imediatas, como checar se um compartimento está disponível no `svc-lockers` ou se um morador existe no `svc-condominos`.
* **Assíncrona (RabbitMQ):** Notificações e acionamentos de hardware. Ao realizar ou retirar uma entrega, o `svc-entregas` publica eventos nas filas `fila_logs` e `fila_abertura`, que são consumidas paralelamente sem bloquear o cliente.

## Tecnologias Utilizadas

* **Node.js & Express:** Servidor base e rotas web.
* **http-proxy-middleware:** Roteamento no API Gateway.
* **SQLite3:** Banco de dados relacional (arquivos locais e independentes).
* **Axios:** Cliente HTTP para comunicação interna.
* **RabbitMQ (amqplib):** Message Broker para filas e eventos assíncronos.
* **Docker:** Utilizado para subir o contêiner do RabbitMQ.

---

## como Executar o Projeto

### Pré-requisitos
* Node.js (v18+)
* Docker (para rodar o servidor do RabbitMQ)

### Passo 1: Subir o Message Broker (RabbitMQ)
No terminal da sua máquina, inicie um contêiner do RabbitMQ:
\`\`\`bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
\`\`\`

### Passo 2: Instalar Dependências e Iniciar os Serviços
Abra 6 terminais integrados (ou abas) e execute a inicialização em **cada uma das pastas do projeto**:

\`\`\`bash
# Terminal 1
cd api-gateway && npm install && node server.js

# Terminal 2
cd svc-lockers && npm install && node server.js

# Terminal 3
cd svc-condominos && npm install && node server.js

# Terminal 4
cd svc-entregas && npm install && node server.js

# Terminal 5
cd svc-logging && npm install && node server.js

# Terminal 6
cd svc-controle-abertura && npm install && node server.js
\`\`\`

---

## Como Testar (Endpoints Principais)

Todas as requisições devem ser enviadas para o **API Gateway** (`http://localhost:3000`).

**1. Cadastrar Locker**
* `POST /api/lockers`
* Body: `{ "locker_id": "LOC-01", "localizacao": "Portaria", "numero_gaveta": 1, "tamanho": "M" }`

**2. Cadastrar Condômino**
* `POST /api/condominos`
* Body: `{ "nome": "João", "cpf": "123", "bloco": "A", "apartamento": "101", "email": "joao@email.com" }`

**3. Depositar Encomenda (Ação do Entregador)**
* `POST /api/entregas`
* Body: `{ "compartimento_id": 1, "condomino_id": 1, "descricao_encomenda": "Pacote" }`
* *Resultado: Verifica nos terminais do logging e da abertura as reações do RabbitMQ.*

**4. Retirar Encomenda (Ação do Condômino)**
* `POST /api/entregas/retirar/1`
* *Resultado: Simula a abertura e grava no log de forma assíncrona.*

**5. Consultar Histórico (Ação do Admin)**
* `GET /api/logging`
* *Resultado: Retorna a tabela completa de auditoria populada pelo mensageiro.*

---
**Autor:** Arthur Rosa dos Santos
**Instituição:** UFSC (Universidade Federal de Santa Catarina) - Sistemas de Informação
