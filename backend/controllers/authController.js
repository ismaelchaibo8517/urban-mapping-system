const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const passwordValidator = require('../utils/passwordValidator');

// Administradores pré-cadastrados para cada cidade
const predefinedAdmins = [
    {
        name: 'Administrador Chimoio',
        email: 'admin.chimoio@system.com',
        password: 'AdminChimoio123!',
        role: 'admin',
        city: 'Chimoio'
    },
    {
        name: 'Administrador Beira', 
        email: 'admin.beira@system.com',
        password: 'AdminBeira123!',
        role: 'admin',
        city: 'Beira'
    }
];

const register = async (req, res) => {
    try {
        const { name, email, password, city } = req.body;
        
        // Validações
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        // Validar senha forte
        const passwordValidation = passwordValidator(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.message });
        }
        
        // Verificar se email já existe
        const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        const userRole = 'user'; // Novos usuários são sempre usuários comuns
        
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, userRole]
        );
        
        res.status(201).json({ 
            message: 'Usuário criado com sucesso!',
            userId: result.insertId
        });
        
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        // Verificar se é um admin pré-definido
        const predefinedAdmin = predefinedAdmins.find(admin => admin.email === email);
        if (predefinedAdmin) {
            if (password === predefinedAdmin.password) {
                // Login bem-sucedido para admin pré-definido
                const token = jwt.sign(
                    { 
                        userId: email, // Usar email como ID para admins pré-definidos
                        isPredefinedAdmin: true 
                    }, 
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                return res.json({
                    message: 'Login de administrador realizado com sucesso!',
                    token,
                    user: {
                        id: email,
                        name: predefinedAdmin.name,
                        email: predefinedAdmin.email,
                        role: 'admin',
                        city: predefinedAdmin.city,
                        isPredefinedAdmin: true
                    }
                });
            } else {
                return res.status(400).json({ error: 'Credenciais inválidas' });
            }
        }
        
        // Buscar usuário no banco de dados
        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Credenciais inválidas' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciais inválidas' });
        }
        
        const token = jwt.sign(
            { userId: user.id }, 
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = { register, login, predefinedAdmins };