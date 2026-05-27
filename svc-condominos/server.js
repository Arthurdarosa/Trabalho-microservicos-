const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());
const PORT = 3002;

// Configuração do Banco de Dados SQLite Isolado
const dbPath = path.resolve(__dirname, 'condominos.db');
const db = new sqlite3.Database(dbPath);

// Helpers para Promessas
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

// Criação da tabela de moradores
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS condominos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            bloco TEXT NOT NULL,
            apartamento TEXT NOT NULL,
            email TEXT NOT NULL
        )
    `);
});

// --- ROTAS DO CRUD ---

// C - Cadastrar um novo condômino
app.post('/', async (req, res) => {
    const { nome, cpf, bloco, apartamento, email } = req.body;
    if (!nome || !cpf || !bloco || !apartamento || !email) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    try {
        const sql = `INSERT INTO condominos (nome, cpf, bloco, apartamento, email) VALUES (?, ?, ?, ?, ?)`;
        const result = await dbRun(sql, [nome, cpf, bloco, apartamento, email]);
        res.status(201).json({ id: result.lastID, message: 'Condômino cadastrado com sucesso!' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Este CPF já está cadastrado.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// R - Listar todos os condôminos
app.get('/', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM condominos');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// R - Buscar condômino específico por ID
app.get('/:id', async (req, res) => {
    try {
        const row = await dbAll('SELECT * FROM condominos WHERE id = ?', [req.params.id]);
        if (row.length === 0) return res.status(404).json({ error: 'Condômino não encontrado.' });
        res.json(row[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// U - Atualizar dados do condômino
app.put('/:id', async (req, res) => {
    const { nome, bloco, apartamento, email } = req.body;
    try {
        const sql = `UPDATE condominos SET nome = COALESCE(?, nome), bloco = COALESCE(?, bloco), apartamento = COALESCE(?, apartamento), email = COALESCE(?, email) WHERE id = ?`;
        const result = await dbRun(sql, [nome, bloco, apartamento, email, req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Condômino não encontrado.' });
        res.json({ message: 'Dados do condômino atualizados!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// D - Remover um condômino
app.delete('/:id', async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM condominos WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Condômino não encontrado.' });
        res.json({ message: 'Condômino removido com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(` Svc-Condominos rodando na porta ${PORT}`));