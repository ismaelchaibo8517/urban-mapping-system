// Configurações das cidades
const cityCoordinates = {
    'Chimoio': { lat: -19.116394, lng: 33.483333, zoom: 13 },
    'Beira': { lat: -19.799999, lng: 34.900000, zoom: 13 }
};

let map, currentMarkers = [], currentUser = null, selectedLocation = null;

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    checkAuth();
    loadProblems();
    
    console.log('🚀 Sistema carregado com sucesso!');
    console.log('📍 Coordenadas Chimoio:', cityCoordinates.Chimoio);
    console.log('📍 Coordenadas Beira:', cityCoordinates.Beira);
});

// Inicializar mapa
function initMap() {
    map = L.map('map').setView([-19.116394, 33.483333], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Evento de clique no mapa
    map.on('click', function(e) {
        if (document.getElementById('reportModal').style.display === 'flex') {
            selectLocation(e.latlng);
        }
    });
    
    console.log('🗺️ Mapa inicializado com sucesso!');
}

// Autenticação
async function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        updateUI();
        console.log('👤 Usuário autenticado:', currentUser.name);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            updateUI();
            hideModals();
            showNotification('✅ Login realizado com sucesso!', 'success');
        } else {
            showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('🌐 Erro de conexão com o servidor', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            showNotification('✅ Conta criada com sucesso! Faça login.', 'success');
            showLoginForm();
        } else {
            showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('🌐 Erro de conexão', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    updateUI();
    showNotification('👋 Logout realizado!', 'info');
}

// Gerenciar problemas
async function loadProblems(city = '', category = '') {
    try {
        let url = '/api/problems';
        if (city || category) {
            const params = new URLSearchParams();
            if (city) params.append('city', city);
            if (category) params.append('category', category);
            url += '?' + params.toString();
        }

        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            displayProblems(data.problems);
            updateStats(data.problems);
            console.log(`📊 ${data.problems.length} problemas carregados`);
        } else {
            console.error('Erro ao carregar problemas:', data.error);
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
        showNotification('🌐 Erro ao carregar problemas', 'error');
    }
}

function displayProblems(problems) {
    // Limpar marcadores antigos
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];

    // Adicionar novos marcadores
    problems.forEach(problem => {
        const icon = getCategoryIcon(problem.category);
        
        const marker = L.marker([problem.latitude, problem.longitude], { icon })
            .addTo(map)
            .bindPopup(`
                <div style="min-width: 250px;">
                    <h3>${problem.title}</h3>
                    <p><strong>📍 Local:</strong> ${problem.city}</p>
                    <p><strong>🔧 Tipo:</strong> ${problem.category}</p>
                    <p><strong>📊 Status:</strong> <span style="color: ${
                        problem.status === 'resolved' ? '#27ae60' : 
                        problem.status === 'in_progress' ? '#f39c12' : '#e74c3c'
                    }">${problem.status}</span></p>
                    <p>${problem.description}</p>
                    <p><small>👤 Reportado por: ${problem.user_name || 'Anônimo'}</small></p>
                </div>
            `);
        
        currentMarkers.push(marker);
    });
}

function getCategoryIcon(category) {
    const iconUrl = {
        'Rua Não Transitável': '🚧',
        'Buraco na Rua': '🕳️',
        'Vazamento de Água': '💧',
        'Acúmulo de Lixo': '🗑️',
        'Outros': '❓'
    }[category] || '📍';

    return L.divIcon({
        html: `<div style="
            background: #e74c3c; 
            color: white; 
            border-radius: 50%; 
            width: 40px; 
            height: 40px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 20px;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        ">${iconUrl}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
}

async function handleReportProblem(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('🔒 Faça login para reportar problemas', 'warning');
        showLogin();
        return;
    }

    if (!selectedLocation) {
        showNotification('📍 Selecione uma localização no mapa', 'warning');
        return;
    }

    const problemData = {
        title: document.getElementById('reportTitle').value,
        description: document.getElementById('reportDesc').value,
        category: document.getElementById('reportCategory').value,
        city: document.getElementById('reportCity').value,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/problems', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(problemData)
        });

        const data = await response.json();
        
        if (response.ok) {
            showNotification('✅ Problema reportado com sucesso!', 'success');
            hideModals();
            loadProblems();
            document.getElementById('reportForm').reset();
            selectedLocation = null;
        } else {
            showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('🌐 Erro de conexão', 'error');
    }
}

// Funções utilitárias
function changeCity(city) {
    const coords = cityCoordinates[city];
    map.setView([coords.lat, coords.lng], coords.zoom);
    loadProblems(city);
    showNotification(`📍 Visualizando problemas em ${city}`, 'info');
}

function filterProblems() {
    const category = document.getElementById('problemFilter').value;
    loadProblems('', category);
}

function selectLocation(latlng) {
    selectedLocation = latlng;
    const locationText = `📍 ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    document.getElementById('selectedLocation').innerHTML = locationText;
    
    // Adicionar marcador temporário
    if (window.tempMarker) {
        map.removeLayer(window.tempMarker);
    }
    window.tempMarker = L.marker(latlng)
        .addTo(map)
        .bindPopup('📍 Localização selecionada')
        .openPopup();
}

function updateUI() {
    const userInfo = document.getElementById('userInfo');
    if (currentUser) {
        userInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span>👤 Olá, ${currentUser.name}</span>
                <button onclick="logout()" class="btn btn-danger">🚪 Sair</button>
            </div>
        `;
    } else {
        userInfo.innerHTML = `<button onclick="showLogin()" class="btn">🔑 Entrar / Registrar</button>`;
    }
}

function updateStats(problems) {
    document.getElementById('problemCount').textContent = problems.length;
}

function showNotification(message, type = 'info') {
    // Criar notificação simples
    alert(message); // Em produção, usar sistema de notificações bonito
}

// Gerenciamento de modais
function showLogin() { 
    document.getElementById('loginModal').style.display = 'flex'; 
    showLoginForm();
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showReportForm() { 
    if (!currentUser) {
        showLogin();
        showNotification('🔒 Faça login para reportar problemas', 'warning');
        return;
    }
    document.getElementById('reportModal').style.display = 'flex'; 
}

function hideModals() { 
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Testar conexão com a API
async function testAPI() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('✅ API conectada:', data);
    } catch (error) {
        console.error('❌ Erro na API:', error);
    }
}

// Testar ao carregar
testAPI();