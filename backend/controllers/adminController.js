const pool = require('../config/database');

const getStats = async (req, res) => {
    try {
        const [cityStats] = await pool.execute(`
            SELECT city, COUNT(*) as count, 
                   SUM(CASE WHEN status = 'reported' THEN 1 ELSE 0 END) as reported,
                   SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                   SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
            FROM problems 
            GROUP BY city
        `);
        
        const [categoryStats] = await pool.execute(`
            SELECT category, COUNT(*) as count 
            FROM problems 
            GROUP BY category
        `);
        
        const [recentProblems] = await pool.execute(`
            SELECT p.*, u.name as user_name 
            FROM problems p 
            LEFT JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC 
            LIMIT 10
        `);
        
        const [totalStats] = await pool.execute(`
            SELECT 
                COUNT(*) as totalProblems,
                COUNT(DISTINCT user_id) as totalUsers,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedProblems
            FROM problems
        `);
        
        res.json({
            cityStats,
            categoryStats,
            recentProblems,
            totalStats: totalStats[0]
        });
        
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT id, name, email, role, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        
        res.json({ users });
        
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = { getStats, getAllUsers };