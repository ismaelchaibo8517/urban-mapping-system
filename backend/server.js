const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração básica
app.use(cors({
    origin: [
        "https://urban-mapping-system.vercel.app",
        "http://localhost:3000"
    ],
    credentials: true
}));

app.use(express.json());

// Rota de teste
app.get('/api/test', (req, res) => {
    res.json({
        message: '✅ Backend está funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Rota de login simples para teste
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        // Credenciais fixas para teste
        if (email === 'admin@system.com' && password === 'Admin123!') {
            const token = jwt.sign(
                { userId: 1, email: email, role: 'admin' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '24h' }
            );

            return res.json({
                message: 'Login realizado com sucesso!',
                token,
                user: {
                    id: 1,
                    name: 'Administrador',
                    email: email,
                    role: 'admin'
                }
            });
        }

        res.status(400).json({ error: 'Credenciais inválidas' });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/', (req, res) => {
    res.json({
        message: '🚀 Urban Mapping Backend API',
        status: 'online',
        version: '1.0.0'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});