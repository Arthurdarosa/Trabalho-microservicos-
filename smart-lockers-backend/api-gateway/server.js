const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;
const cors = require('cors');
app.use(cors())

const SERVICES = {
    lockers: 'http://localhost:3001',
    condominos: 'http://localhost:3002',
    entregas: 'http://localhost:3003',
    logging: 'http://localhost:3004',
};


const autorizar = (rolesPermitidas) => {
    return (req, res, next) => {
        // Pega quem o usuário diz que é no Postman
        const role = req.headers['x-role']; 
        
        if (!role) {
            return res.status(401).json({ error: 'Acesso não autorizado. Informe o Header x-role.' });
        }
        
        if (!rolesPermitidas.includes(role)) {
            return res.status(403).json({ error: 'Acesso negado. Seu perfil não tem permissão para esta ação.' });
        }
        
        next(); 
    };
};


// Apenas ADMIN pode ver os logs
app.use('/api/logging', autorizar(['admin']), createProxyMiddleware({
    target: SERVICES.logging,
    changeOrigin: true,
    pathRewrite: { '^/api/logging': '' },
}));

// 1º - Rota ESPECÍFICA (Liberada para condomino e admin)
app.use('/api/lockers/condomino', autorizar(['admin', 'condomino']), createProxyMiddleware({ 
    target: SERVICES.lockers, 
    changeOrigin: true,
    // A função intercepta a URL original completa e substitui o prefixo corretamente
    pathRewrite: (path, req) => req.originalUrl.replace('/api/lockers/condomino', '/condomino'), 
}));

// 2º - Rota GERAL (Liberada APENAS para admin)
app.use('/api/lockers', autorizar(['admin']), createProxyMiddleware({ 
    target: SERVICES.lockers, 
    changeOrigin: true,
    pathRewrite: { '^/api/lockers': '' }, 
}));

app.use('/api/condominos', autorizar(['admin']), createProxyMiddleware({
    target: SERVICES.condominos,
    changeOrigin: true,
    pathRewrite: { '^/api/condominos': '' },
}));

// ENTREGADOR E CONDÔMINO acessam o serviço de entregas (mas fazem coisas diferentes lá dentro)
app.use('/api/entregas', autorizar(['admin', 'entregador', 'condomino']), createProxyMiddleware({
    target: SERVICES.entregas,
    changeOrigin: true,
    pathRewrite: { '^/api/entregas': '' },
}));

const proxyOptions = (target) => ({
    target: target,
    changeOrigin: true,
    pathRewrite: { '^/api/[a-z]+': '' }, // Genérico para qualquer endpoint
    onError: (err, req, res) => {
        res.status(502).json({ error: 'O microsserviço de destino está offline.' });
    }
});

app.listen(3000, () => {
    console.log('API Gateway rodando na porta 3000');
});

// Rota de monitoramento que não precisa de autorização
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Gateway OK', services: 'All systems operational' });
});