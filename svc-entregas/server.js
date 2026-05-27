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

// --- ROTAS ---

// 1. REGISTRAR ENTREGA (Entregador usa na tela do locker)
app.post('/', async (req, res) => {
    const { compartimento_id, condomino_id, descricao_encomenda } = req.body;

    try {
        // Validação Síncrona 1: O compartimento existe e está disponível?
        const resLocker = await axios.get(`http://localhost:3001/${compartimento_id}`).catch(() => null);
        if (!resLocker || resLocker.data.status !== 'disponivel') {
            return res.status(400).json({ error: 'Compartimento inválido ou já ocupado.' });
        }

        // Validação Síncrona 2: O condômino existe?
        const resCondomino = await axios.get(`http://localhost:3002/${condomino_id}`).catch(() => null);
        if (!resCondomino) {
            return res.status(400).json({ error: 'Condômino não encontrado no sistema.' });
        }

        // Fluxo de persistência interna
        const sql = `INSERT INTO entregas (compartimento_id, condomino_id, descricao_encomenda) VALUES (?, ?, ?)`;
        const result = await dbRun(sql, [compartimento_id, condomino_id, descricao_encomenda]);
        const entregaId = result.lastID;

        // Atualiza o status do compartimento para ocupado lá no svc-lockers (Via HTTP)
        await axios.put(`http://localhost:3001/${compartimento_id}`, { status: 'ocupado' });

        // --- ENVIANDO PARA AS FILAS (MENSAGERIA) ---
        if (rabbitChannel) {
            const payloadLog = { evento: 'ENTREGA_DEPOSITADA', entrega_id: entregaId, data: new Date() };
            const payloadAbertura = { comando: 'ABRIR_PORTA', compartimento_id: compartimento_id, motivo: 'Deposito' };

            rabbitChannel.sendToQueue(QUEUE_LOGS, Buffer.from(JSON.stringify(payloadLog)));
            rabbitChannel.sendToQueue(QUEUE_ABERTURA, Buffer.from(JSON.stringify(payloadAbertura)));
        }

        res.status(201).json({ id: entregaId, message: 'Encomenda guardada e notificações disparadas!' });
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

// Listar todas as entregas (Para visualização do admin)
app.get('/', async (req, res) => {
    const rows = await dbAll('SELECT * FROM entregas');
    res.json(rows);
});

app.listen(PORT, () => console.log(` Svc-Entregas rodando na porta ${PORT}`));