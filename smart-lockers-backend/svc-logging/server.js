const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const amqplib = require('amqplib');
const path = require('path');

const app = express();
app.use(express.json());
const PORT = 3004;

// Configuração do Banco de Dados Isolado (logging.db)
const dbPath = path.resolve(__dirname, 'logging.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            evento TEXT NOT NULL,
            entrega_id INTEGER NOT NULL,
            data TEXT NOT NULL
        )
    `);
});

// Helper para ler dados
const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// --- ROTA REST (Para o Gateway / Administrador) ---
app.get('/', async (req, res) => {
    try {
        // Retorna todos os logs, do mais recente para o mais antigo
        const logs = await dbAll('SELECT * FROM logs ORDER BY id DESC');
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CONSUMIDOR DO RABBITMQ (Roda em Background) ---
async function iniciarConsumidorLogs() {
    try {
        const connection = await amqplib.connect('amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue('fila_logs', { durable: true });

        console.log(' [Logging] Conectado ao RabbitMQ. Escutando eventos...');

        channel.consume('fila_logs', (msg) => {
            if (msg !== null) {
                const log = JSON.parse(msg.content.toString());
                
                // Insere no banco silenciosamente
                db.run(`INSERT INTO logs (evento, entrega_id, data) VALUES (?, ?, ?)`, 
                    [log.evento, log.entrega_id, log.data], 
                    (err) => {
                        if (!err) {
                            console.log(` Log Salvo: [${log.evento}] para a Entrega ID: ${log.entrega_id}`);
                            channel.ack(msg); // Remove a mensagem da fila
                        } else {
                            console.error('Erro ao salvar no banco:', err);
                        }
                    }
                );
            }
        });
    } catch (err) {
        console.error(' Erro de conexão com RabbitMQ no Logging:', err.message);
    }
}
iniciarConsumidorLogs();

app.listen(PORT, () => console.log(` Svc-Logging rodando na porta ${PORT}`));