const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

// Definição das URLs dos microsserviços internos
const SERVICES = {
    lockers: 'http://localhost:3001',
    condominos: 'http://localhost:3002',
    entregas: 'http://localhost:3003',
    logging: 'http://localhost:3004',
};

console.log('🛒 API Gateway inicializando...');

// Rota de checagem de saúde do Gateway
app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway está operando normalmente.' });
});

// 1. Proxy para o Cadastro de Lockers
app.use('/api/lockers', createProxyMiddleware({
    target: SERVICES.lockers,
    changeOrigin: true,
    pathRewrite: {
        '^/api/lockers': '', // Remove o prefixo ao repassar para o microsserviço
    },
}));

// 2. Proxy para o Cadastro de Condôminos
app.use('/api/condominos', createProxyMiddleware({
    target: SERVICES.condominos,
    changeOrigin: true,
    pathRewrite: {
        '^/api/condominos': '',
    },
}));

// 3. Proxy para o Controle de Entregas
app.use('/api/entregas', createProxyMiddleware({
    target: SERVICES.entregas,
    changeOrigin: true,
    pathRewrite: {
        '^/api/entregas': '',
    },
}));

// 4. Proxy para o Serviço de Logging
app.use('/api/logging', createProxyMiddleware({
    target: SERVICES.logging,
    changeOrigin: true,
    pathRewrite: {
        '^/api/logging': '',
    },
}));

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(` API Gateway rodando com sucesso na porta ${PORT}`);
    console.log(`--- Rotas Disponíveis (Postman) ---`);
    console.log(`Lockers:   http://localhost:${PORT}/api/lockers`);
    console.log(`Condôminos: http://localhost:${PORT}/api/condominos`);
    console.log(`Entregas:  http://localhost:${PORT}/api/entregas`);
    console.log(`Logging:   http://localhost:${PORT}/api/logging`);
});