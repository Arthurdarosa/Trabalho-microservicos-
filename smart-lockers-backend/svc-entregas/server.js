const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const amqplib = require('amqplib');
const path = require('path');

const app = express();
app.use(express.json());
const PORT = 3003;

// Configuração do Banco de Dados Isolado (entregas.db)
const dbPath = path.resolve(__dirname, 'entregas.db');
const db = new sqlite3.Database(dbPath);

const dbRun = (query, params = []) => new Promise((res, rej) => db.run(query, params, function(err) { if (err) rej(err); else res(this); }));
const dbAll = (query, params = []) => new Promise((res, rej) => db.all(query, params, (err, rows) => { if (err) rej(err); else res(rows); }));

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS entregas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            compartimento_id INTEGER NOT NULL,
            condomino_id INTEGER NOT NULL,
            descricao_encomenda TEXT,
            status TEXT DEFAULT 'armazenado' -- armazenado / retirado
        )
    `);
});

// Configuração do RabbitMQ
let rabbitChannel = null;
const QUEUE_LOGS = 'fila_logs';
const QUEUE_ABERTURA = 'fila_abertura';

async function connectRabbit() {
    try {
        const connection = await amqplib.connect('amqp://localhost');
        rabbitChannel = await connection.createChannel();
        await rabbitChannel.assertQueue(QUEUE_LOGS, { durable: true });
        await rabbitChannel.assertQueue(QUEUE_ABERTURA, { durable: true });
        console.log(' Conectado ao RabbitMQ com sucesso!');
    } catch (err) {
        console.error(' Erro ao conectar no RabbitMQ. Certifique-se de que ele está rodando.', err.message);
    }
}
connectRabbit();

// 1. REGISTRAR ENTREGA (Entregador usa na tela do locker)
app.post('/', async (req, res) => {
    const { condominio, condomino_id, tamanho_encomenda, descricao_encomenda } = req.body;

    if (!condominio || !condomino_id || !tamanho_encomenda) {
        return res.status(400).json({ error: 'condominio, condomino_id e tamanho_encomenda são obrigatórios.' });
    }

    try {
        // Validação 1: O condômino existe?
        const resCondomino = await axios.get(`http://localhost:3002/${condomino_id}`).catch(() => null);
        if (!resCondomino) return res.status(400).json({ error: 'Condômino não encontrado no sistema.' });

        // Validação 2: Buscar lockers
        const resLockers = await axios.get(`http://localhost:3001/`).catch(() => null);
        if (!resLockers || !resLockers.data) return res.status(500).json({ error: 'Erro ao se comunicar com o serviço de Lockers.' });

        // A MUDANÇA ESTÁ AQUI: Filtra apenas as gavetas que SÃO DESSE MORADOR e estão vazias
        const compartimentosDoMorador = resLockers.data.filter(
            c => c.condominio === condominio && c.condomino_id === condomino_id && c.status === 'disponivel'
        );

        if (compartimentosDoMorador.length === 0) {
            return res.status(400).json({ error: 'Este morador não possui gavetas disponíveis no momento.' });
        }

        // Mantemos a hierarquia: se a caixa for P e a gaveta do cara for G, ela entra.
        const hierarquia = { 'P': ['P', 'M', 'G', 'XG'], 'M': ['M', 'G', 'XG'], 'G': ['G', 'XG'], 'XG': ['XG'] };
        const tamanhosPermitidos = hierarquia[tamanho_encomenda];
        if (!tamanhosPermitidos) return res.status(400).json({ error: 'Tamanho inválido. Use P, M, G ou XG.' });

        let compartimentoSelecionado = null;
        for (const tam of tamanhosPermitidos) {
            compartimentoSelecionado = compartimentosDoMorador.find(c => c.tamanho === tam);
            if (compartimentoSelecionado) break;
        }

        if (!compartimentoSelecionado) {
            return res.status(400).json({ error: `A gaveta do morador é menor que a encomenda de tamanho ${tamanho_encomenda}.` });
        }

        const compartimento_id = compartimentoSelecionado.id;

        // Persistência e Mensageria
        const sql = `INSERT INTO entregas (compartimento_id, condomino_id, descricao_encomenda) VALUES (?, ?, ?)`;
        const result = await dbRun(sql, [compartimento_id, condomino_id, descricao_encomenda]);
        const entregaId = result.lastID;

        await axios.put(`http://localhost:3001/${compartimento_id}`, { status: 'ocupado' });

        if (rabbitChannel) {
            rabbitChannel.sendToQueue(QUEUE_LOGS, Buffer.from(JSON.stringify({ evento: 'ENTREGA_DEPOSITADA', entrega_id: entregaId, data: new Date() })));
            rabbitChannel.sendToQueue(QUEUE_ABERTURA, Buffer.from(JSON.stringify({ comando: 'ABRIR_PORTA', compartimento_id: compartimento_id, motivo: 'Deposito' })));
        }

        res.status(201).json({ 
            id: entregaId, 
            message: 'Encomenda guardada na gaveta exclusiva do morador!',
            detalhes: { gaveta_alocada: compartimentoSelecionado.numero_gaveta }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. RETIRAR ENCOMENDA (Condômino pelo App)
app.post('/retirar/:id', async (req, res) => {
    const entregaId = req.params.id;

    try {
        const rows = await dbAll('SELECT * FROM entregas WHERE id = ?', [entregaId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Entrega não encontrada.' });
        
        const entrega = rows[0];
        if (entrega.status === 'retirado') return res.status(400).json({ error: 'Esta encomenda já foi retirada.' });

        // Atualiza banco local
        await dbRun('UPDATE entregas SET status = "retirado" WHERE id = ?', [entregaId]);

        // Libera o compartimento lá no svc-lockers (Via HTTP)
        await axios.put(`http://localhost:3001/${entrega.compartimento_id}`, { status: 'disponivel' });

        // --- ENVIANDO PARA AS FILAS (MENSAGERIA) ---
        if (rabbitChannel) {
            const payloadLog = { evento: 'ENTREGA_RETIRADA', entrega_id: entregaId, data: new Date() };
            const payloadAbertura = { comando: 'ABRIR_PORTA', compartimento_id: entrega.compartimento_id, motivo: 'Retirada' };

            rabbitChannel.sendToQueue(QUEUE_LOGS, Buffer.from(JSON.stringify(payloadLog)));
            rabbitChannel.sendToQueue(QUEUE_ABERTURA, Buffer.from(JSON.stringify(payloadAbertura)));
        }

        res.json({ message: 'Compartimento aberto! Retire sua encomenda.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. VERIFICAR ENCOMENDAS (Condômino pelo App)
app.get('/condomino/:id', async (req, res) => {
    try {
        // Retorna apenas as encomendas daquele morador que ainda estão no armário
        const sql = `SELECT * FROM entregas WHERE condomino_id = ? AND status = 'armazenado'`;
        const rows = await dbAll(sql, [req.params.id]);
        
        if (rows.length === 0) {
            return res.json({ message: 'Você não tem novas encomendas no momento.' });
        }
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', async (req, res) => {
    const rows = await dbAll('SELECT * FROM entregas');
    res.json(rows);
});

app.listen(PORT, () => console.log(` Svc-Entregas rodando na porta ${PORT}`));