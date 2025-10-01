const pool = require('../config/database');
const path = require('path');
const fs = require('fs');

const getAllProblems = async (req, res) => {
    try {
        const { city, category, status } = req.query;
        
        let query = `
            SELECT p.*, u.name as user_name 
            FROM problems p 
            LEFT JOIN users u ON p.user_id = u.id 
            WHERE 1=1
        `;
        const params = [];
        
        if (city) {
            query += ' AND p.city = ?';
            params.push(city);
        }
        
        if (category) {
            query += ' AND p.category = ?';
            params.push(category);
        }
        
        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY p.created_at DESC';
        
        const [problems] = await pool.execute(query, params);
        
        res.json({
            count: problems.length,
            problems: problems
        });
        
    } catch (error) {
        console.error('Erro ao buscar problemas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const createProblem = async (req, res) => {
    try {
        const { title, description, category, latitude, longitude, city } = req.body;
        let imageUrl = null;
        
        // Processar upload de imagem se existir
        if (req.files && req.files.image) {
            const image = req.files.image;
           const uploadDir = path.join(__dirname, '../uploads');
            
            // Criar diretório se não existir
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Gerar nome único para o arquivo
            const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(image.name);
            const uploadPath = path.join(uploadDir, uniqueName);
            
            // Mover arquivo
            await image.mv(uploadPath);
            imageUrl = `/uploads/${uniqueName}`;
        }
        
        const [result] = await pool.execute(
            `INSERT INTO problems (title, description, category, latitude, longitude, city, user_id, image_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, category, latitude, longitude, city, req.user.id, imageUrl]
        );
        
        // Buscar problema criado com dados do usuário
        const [problems] = await pool.execute(
            `SELECT p.*, u.name as user_name 
             FROM problems p 
             LEFT JOIN users u ON p.user_id = u.id 
             WHERE p.id = ?`,
            [result.insertId]
        );
        
        res.status(201).json({ 
            message: 'Problema reportado com sucesso!',
            problem: problems[0]
        });
        
    } catch (error) {
        console.error('Erro ao criar problema:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// ... resto do código permanece igual

module.exports = { getAllProblems, createProblem, updateProblemStatus };