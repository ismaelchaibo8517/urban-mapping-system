// Configurações do mapa para cada cidade
const cityCoordinates = {
    'Chimoio': { 
        lat: -19.116394, 
        lng: 33.483333, 
        zoom: 13
    },
    'Beira': { 
        lat: -19.799999, 
        lng: 34.900000, 
        zoom: 13
    }
};

let map;
let currentMarkers = [];
let currentCity = 'Chimoio';

// Inicializar mapa
function initMap() {
    const coords = cityCoordinates[currentCity];
    
    // Inicializar mapa
    map = L.map('map').setView([coords.lat, coords.lng], coords.zoom);
    
    // Adicionar tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Carregar problemas
    loadProblems();
    
    // Adicionar alguns marcadores de exemplo
    addSampleMarkers();
}

// Adicionar marcadores de exemplo
function addSampleMarkers() {
    const sampleProblems = [
        {
            id: 1,
            title: "Buraco na Avenida Principal",
            description: "Grande buraco causando transtornos no trânsito",
            category: "Buraco na Rua",
            latitude: -19.116394,
            longitude: 33.483333,
            city: "Chimoio",
            status: "reported"
        },
        {
            id: 2,
            title: "Acúmulo de Lixo",
            description: "Lixo acumulado há mais de uma semana",
            category: "Acúmulo de Lixo", 
            latitude: -19.120000,
            longitude: 33.490000,
            city: "Chimoio",
            status: "in_progress"
        }
    ];
    
    displayProblems(sampleProblems);
}

// Carregar problemas
async function loadProblems() {
    try {
        // Por enquanto usar dados de exemplo
        // Mais tarde integrar com API
        console.log('Carregando problemas...');
    } catch (error) {
        console.error('Erro ao carregar problemas:', error);
    }
}

// Exibir problemas no mapa
function displayProblems(problems) {
    // Limpar marcadores existentes
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];
    
    // Adicionar novos marcadores
    problems.forEach(problem => {
        const icon = getCategoryIcon(problem.category);
        
        const marker = L.marker([problem.latitude, problem.longitude], { icon })
            .addTo(map)
            .bindPopup(`
                <div class="popup-content">
                    <h3>${problem.title}</h3>
                    <p><strong>Tipo:</strong> ${problem.category}</p>
                    <p><strong>Status:</strong> <span class="status-${problem.status}">${getStatusText(problem.status)}</span></p>
                    <p>${problem.description}</p>
                </div>
            `);
        
        currentMarkers.push(marker);
    });
}

// Obter ícone baseado na categoria
function getCategoryIcon(category) {
    const iconOptions = {
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    };
    
    const icons = {
        'Rua Não Transitável': L.icon({
            ...iconOptions,
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/984/984384.png'
        }),
        'Buraco na Rua': L.icon({
            ...iconOptions,
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/3208/3208726.png'
        }),
        'Vazamento de Água': L.icon({
            ...iconOptions,
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/251/251831.png'
        }),
        'Acúmulo de Lixo': L.icon({
            ...iconOptions,
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/783/783775.png'
        })
    };
    
    return icons[category] || L.icon({
        ...iconOptions,
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png'
    });
}

// Atualizar mapa quando cidade for alterada
function changeCity(city) {
    currentCity = city;
    const coords = cityCoordinates[city];
    
    map.setView([coords.lat, coords.lng], coords.zoom);
    
    // Atualizar botões
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.city === city) {
            btn.classList.add('active');
        }
    });
    
    // Recarregar problemas para a cidade
    loadProblems();
}

// Atualizar mapa
function refreshMap() {
    const problemType = document.getElementById('problemTypeFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    // Aqui você pode filtrar os problemas baseado nos filtros
    console.log('Filtrando por:', problemType, status);
}

// Converter status para texto
function getStatusText(status) {
    const statusMap = {
        'reported': 'Reportado',
        'in_progress': 'Em Andamento', 
        'resolved': 'Resolvido'
    };
    return statusMap[status] || status;
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    
    // Configurar event listeners para botões de cidade
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            changeCity(this.dataset.city);
        });
    });
});