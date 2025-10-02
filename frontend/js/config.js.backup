// ✅ ESCOLHA UMA DESTAS OPÇÕES:

// OPÇÃO 1 - RENDER.com
const CONFIG = {
    API_BASE_URL: 'https://urban-mapping-backend.onrender.com/api',
    UPLOADS_BASE_URL: 'https://urban-mapping-backend.onrender.com'
};

// OPÇÃO 2 - HEROKU
// const CONFIG = {
//     API_BASE_URL: 'https://urban-mapping-backend.herokuapp.com/api',
//     UPLOADS_BASE_URL: 'https://urban-mapping-backend.herokuapp.com'
// };

// OPÇÃO 3 - FLY.io
// const CONFIG = {
//     API_BASE_URL: 'https://urban-mapping-backend.fly.dev/api',
//     UPLOADS_BASE_URL: 'https://urban-mapping-backend.fly.dev'
// };

// Função para fazer chamadas API
async function apiFetch(endpoint, options = {}) {
    try {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        console.log('🌐 Fazendo requisição para:', url);
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ Erro na API:', error);
        alert('Erro de conexão: ' + error.message);
        throw error;
    }
}

// Função para upload de arquivos
async function apiUpload(endpoint, formData) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        alert('Erro no upload: ' + error.message);
        throw error;
    }
}