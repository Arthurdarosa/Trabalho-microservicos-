const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());
const PORT = 3001;

// Configuração do Banco de Dados SQLite Isolado
const dbPath = path.resolve(__dirname, 'lockers.db');
const db = new sqlite3.Database(dbPath);

// Helper para executar queries com Promessas (Async/Await)
const dbRun = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Criação da tabela inicial
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS compartimentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            locker_id TEXT NOT NULL,
            localizacao TEXT NOT NULL,
            numero_gaveta INTEGER NOT NULL UNIQUE,
            tamanho TEXT CHECK(tamanho IN ('P', 'M', 'G', 'XG')) NOT NULL,
            status TEXT DEFAULT 'disponivel'
        )
    `);
});

// --- ROTAS DO CRUD ---

app.post('/', async (req, res) => {
    const { locker_id, localizacao, numero_gaveta, tamanho } = req.body;

    if (!locker_id || !localizacao || !numero_gaveta || !tamanho) {
        return res.status(400).json({
            error: 'Todos os campos são obrigatórios.'
        });
    }

    try {
        const sql = `
            INSERT INTO compartimentos 
            (locker_id, localizacao, numero_gaveta, tamanho) 
            VALUES (?, ?, ?, ?)
        `;

        const result = await dbRun(sql, [
            locker_id,
            localizacao,
            numero_gaveta,
            tamanho
        ]);

        res.status(201).json({
            id: result.lastID,
            message: 'Compartimento cadastrado com sucesso!'
        });

    } catch (err) {

        // erro de UNIQUE
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                error: `A gaveta número ${numero_gaveta} já está cadastrada.`
            });
        }

        // outros erros
        res.status(500).json({
            error: 'Erro interno do servidor.'
        });
    }
});


app.get('/', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM compartimentos');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/:id', async (req, res) => {
    try {
        const row = await dbAll('SELECT * FROM compartimentos WHERE id = ?', [req.params.id]);
        if (row.length === 0) return res.status(404).json({ error: 'Compartimento não encontrado.' });
        res.json(row[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.put('/:id', async (req, res) => {
    const { localizacao, tamanho, status } = req.body;
    try {
        const sql = `UPDATE compartimentos SET localizacao = COALESCE(?, localizacao), tamanho = COALESCE(?, tamanho), status = COALESCE(?, status) WHERE id = ?`;
        const result = await dbRun(sql, [localizacao, tamanho, status, req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Compartimento não encontrado.' });
        res.json({ message: 'Compartimento atualizado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.delete('/:id', async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM compartimentos WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Compartimento não encontrado.' });
        res.json({ message: 'Compartimento removido com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(` Svc-Lockers rodando na porta ${PORT}`));