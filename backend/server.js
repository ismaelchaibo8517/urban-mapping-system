const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ SEGURANÇA: Variáveis de ambiente
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const DB_FILE = path.join(__dirname, 'database.json');

// ✅ SEGURANÇA: Middlewares de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://urban-mapping-system.vercel.app",
        "https://*.vercel.app"
    ],
    credentials: true
}));

// ✅ SEGURANÇA: Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por IP
});
app.use(limiter);

// ✅ SEGURANÇA: Proteção contra XSS e outros ataques
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Servir arquivos estáticos
//app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ SEGURANÇA: Configuração segura do Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../frontend/uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // ✅ SEGURANÇA: Nome seguro para arquivos
        const safeName = Date.now() + '-' + Math.random().toString(36).substring(2, 15) + path.extname(file.originalname);
        cb(null, safeName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        // ✅ SEGURANÇA: Validar apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'), false);
        }
    }
});

// Servir arquivos de upload
//app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));

// ==================== FUNÇÕES SEGURAS DO DATABASE ====================
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // ✅ SEGURANÇA: Senha forte
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

function initDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        // ✅ SEGURANÇA: Senhas hasheadas
        const hashedAdminPassword = bcrypt.hashSync('Admin123!', 12);
        const hashedUserPassword = bcrypt.hashSync('User123!', 12);
        
        const initialData = {
            users: [
                {
                    id: 1,
                    name: "Administrador Geral",
                    email: "admin@system.com",
                    password: hashedAdminPassword,
                    role: "admin",
                    admin_group: "geral",
                    permissions: {
                        cities: ["Chimoio", "Beira"],
                        categories: ["all"]
                    },
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    name: "Admin Chimoio Infraestrutura",
                    email: "admin.chimoio@system.com",
                    password: hashedAdminPassword,
                    role: "admin",
                    admin_group: "chimoio_infra",
                    permissions: {
                        cities: ["Chimoio"],
                        categories: ["Buraco na Rua", "Rua Não Transitável", "Iluminação Pública"]
                    },
                    created_at: new Date().toISOString()
                },
                {
                    id: 3,
                    name: "Admin Beira Infraestrutura",
                    email: "admin.beira@system.com",
                    password: hashedAdminPassword,
                    role: "admin",
                    admin_group: "beira_infra",
                    permissions: {
                        cities: ["Beira"],
                        categories: ["Buraco na Rua", "Rua Não Transitável", "Iluminação Pública"]
                    },
                    created_at: new Date().toISOString()
                },
                {
                    id: 4,
                    name: "Usuário Teste",
                    email: "user@test.com",
                    password: hashedUserPassword,
                    role: "user",
                    created_at: new Date().toISOString()
                }
            ],
            problems: []
        };
        
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ Database seguro inicializado');
    }
}

function readDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            initDatabase();
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Erro ao ler database:', error);
        return { users: [], problems: [] };
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Erro ao escrever no database:', error);
        return false;
    }
}

function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

// ==================== AUTENTICAÇÃO SEGURA ====================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    try {
        // ✅ SEGURANÇA: JWT seguro
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const db = readDatabase();
        const user = db.users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(403).json({ error: 'Usuário não encontrado' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('❌ Erro na autenticação:', error.message);
        return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
}

function checkAdminPermissions(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    next();
}

// ==================== ROTAS SEGURAS DA API ====================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Sistema seguro funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Rota de teste para verificar se o backend está funcionando
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ Backend está funcionando!', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rota básica da raiz
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 Urban Mapping Backend API', 
        status: 'online',
        version: '1.0.0'
    });
});


// Buscar problemas (com sanitização)
app.get('/api/problems', (req, res) => {
    try {
        const { city, category, status } = req.query;
        const db = readDatabase();
        
        let problems = db.problems;
        
        // ✅ SEGURANÇA: Validação de parâmetros
        if (city && city !== 'all' && ['Chimoio', 'Beira'].includes(city)) {
            problems = problems.filter(p => p.city === city);
        }
        
        if (category && category !== 'all') {
            problems = problems.filter(p => p.category === category);
        }
        
        if (status && status !== 'all' && ['reported', 'in_progress', 'resolved'].includes(status)) {
            problems = problems.filter(p => p.status === status);
        }
        
        const problemsWithUser = problems.map(problem => {
            const user = db.users.find(u => u.id === problem.user_id);
            return {
                ...problem,
                user_name: user ? sanitizeInput(user.name) : 'Anônimo'
            };
        });
        
        res.json({
            count: problemsWithUser.length,
            problems: problemsWithUser.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        });
    } catch (error) {
        console.error('Erro ao buscar problemas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Registrar usuário (seguro)
app.post('/api/register', async (req, res) => {
    try {
        let { name, email, password } = req.body;
        
        // ✅ SEGURANÇA: Sanitização de inputs
        name = sanitizeInput(name?.trim() || '');
        email = email?.trim().toLowerCase() || '';
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        if (name.length < 2 || name.length > 50) {
            return res.status(400).json({ error: 'Nome deve ter entre 2 e 50 caracteres' });
        }
        
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }
        
        if (!validatePassword(password)) {
            return res.status(400).json({ 
                error: 'Senha deve ter: mínimo 8 caracteres, 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial (@$!%*?&)'
            });
        }
        
        const db = readDatabase();
        
        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        // ✅ SEGURANÇA: Hash da senha
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const newUser = {
            id: generateId(),
            name: name,
            email: email,
            password: hashedPassword,
            role: 'user',
            created_at: new Date().toISOString()
        };
        
        db.users.push(newUser);
        
        if (writeDatabase(db)) {
            res.json({ 
                message: 'Usuário criado com sucesso!',
                userId: newUser.id
            });
        } else {
            res.status(500).json({ error: 'Erro ao criar usuário' });
        }
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Login seguro
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        const db = readDatabase();
        const user = db.users.find(u => u.email === email.toLowerCase());
        
        if (!user) {
            // ✅ SEGURANÇA: Não revelar se o email existe
            return res.status(400).json({ error: 'Credenciais inválidas' });
        }
        
        // ✅ SEGURANÇA: Verificação segura da senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciais inválidas' });
        }
        
        // ✅ SEGURANÇA: JWT com tempo de expiração
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                admin_group: user.admin_group || null,
                permissions: user.permissions || null
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ✅ SEGURANÇA: Reportar problema com validação
app.post('/api/problems', authenticateToken, upload.single('photo'), (req, res) => {
    try {
        let { title, description, category, latitude, longitude, city } = req.body;
        
        // ✅ SEGURANÇA: Sanitização
        title = sanitizeInput(title?.trim() || '');
        description = sanitizeInput(description?.trim() || '');
        category = sanitizeInput(category || '');
        city = sanitizeInput(city || '');
        
        // ✅ SEGURANÇA: Validação rigorosa
        if (!title || title.length < 5 || title.length > 100) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Título deve ter entre 5 e 100 caracteres' });
        }
        
        if (!category || !['Buraco na Rua', 'Acúmulo de Lixo', 'Vazamento de Água', 'Rua Não Transitável', 'Iluminação Pública', 'Outros'].includes(category)) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Categoria inválida' });
        }
        
        if (!city || !['Chimoio', 'Beira'].includes(city)) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Cidade inválida' });
        }
        
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Coordenadas inválidas' });
        }
        
        const db = readDatabase();
        
        const newProblem = {
            id: generateId(),
            title: title,
            description: description,
            category: category,
            latitude: lat,
            longitude: lng,
            city: city,
            status: 'reported',
            user_id: req.user.id,
            photo: req.file ? `/uploads/${req.file.filename}` : null,
            created_at: new Date().toISOString()
        };
        
        db.problems.push(newProblem);
        
        if (writeDatabase(db)) {
            const user = db.users.find(u => u.id === req.user.id);
            
            res.status(201).json({ 
                message: 'Problema reportado com sucesso!',
                problem: {
                    ...newProblem,
                    user_name: user ? sanitizeInput(user.name) : 'Anônimo'
                }
            });
        } else {
            if (req.file) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'Erro ao reportar problema' });
        }
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error('Erro ao reportar problema:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ✅ SEGURANÇA: Rotas admin protegidas
app.get('/api/admin/problems', authenticateToken, checkAdminPermissions, (req, res) => {
    try {
        const db = readDatabase();
        
        let problems = db.problems;
        
        // Filtragem por permissões do admin
        if (req.user.admin_group !== 'geral') {
            const userPermissions = req.user.permissions;
            problems = problems.filter(problem => 
                userPermissions.cities.includes(problem.city) &&
                (userPermissions.categories.includes('all') || 
                 userPermissions.categories.includes(problem.category))
            );
        }
        
        const problemsWithUser = problems.map(problem => ({
            ...problem,
            user_name: db.users.find(u => u.id === problem.user_id)?.name || 'Anônimo'
        }));
        
        res.json({
            count: problemsWithUser.length,
            problems: problemsWithUser.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        });
    } catch (error) {
        console.error('Erro admin:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/admin/problems/:id/status', authenticateToken, checkAdminPermissions, (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['reported', 'in_progress', 'resolved'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }
        
        const db = readDatabase();
        const problemIndex = db.problems.findIndex(p => p.id == id);
        
        if (problemIndex === -1) {
            return res.status(404).json({ error: 'Problema não encontrado' });
        }
        
        db.problems[problemIndex].status = status;
        db.problems[problemIndex].updated_at = new Date().toISOString();
        db.problems[problemIndex].updated_by = req.user.id;
        
        if (writeDatabase(db)) {
            res.json({ 
                message: 'Status atualizado com sucesso!',
                problem: db.problems[problemIndex]
            });
        } else {
            res.status(500).json({ error: 'Erro ao atualizar problema' });
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==================== ROTAS DO FRONTEND ====================
//const frontendPaths = [
  //  '/', '/login', '/register', '/dashboard', '/admin', '/report', '/profile'
//];

//frontendPaths.forEach(route => {
//    app.get(route, (req, res) => {
 //       res.sendFile(path.join(__dirname, '../frontend/index.html'));
 //   });
//});

// ✅ SEGURANÇA: Handler de erros
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// ✅ SEGURANÇA: Rota 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// ==================== INICIALIZAÇÃO ====================
initDatabase();

app.listen(PORT, () => {
    console.log('🚀 SERVIDOR SEGURO RODANDO!');
    console.log(`📍 Porta: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log('\n🔐 CREDENCIAIS SEGURAS:');
    console.log('   👑 Admin Geral: admin@system.com / Admin123!');
    console.log('   🏙️  Admin Chimoio: admin.chimoio@system.com / Admin123!');
    console.log('   🌇 Admin Beira: admin.beira@system.com / Admin123!');
    console.log('   👤 Usuário Normal: user@test.com / User123!');
});