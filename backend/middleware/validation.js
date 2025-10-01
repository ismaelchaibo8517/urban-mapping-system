const validateProblem = (req, res, next) => {
    const { title, description, category, latitude, longitude, city } = req.body;
    
    if (!title || title.length < 5) {
        return res.status(400).json({ error: 'Título deve ter pelo menos 5 caracteres' });
    }
    
    if (!description || description.length < 10) {
        return res.status(400).json({ error: 'Descrição deve ter pelo menos 10 caracteres' });
    }
    
    if (!category) {
        return res.status(400).json({ error: 'Categoria é obrigatória' });
    }
    
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Coordenadas são obrigatórias' });
    }
    
    if (!city || !['Chimoio', 'Beira'].includes(city)) {
        return res.status(400).json({ error: 'Cidade deve ser Chimoio ou Beira' });
    }
    
    next();
};

module.exports = { validateProblem };