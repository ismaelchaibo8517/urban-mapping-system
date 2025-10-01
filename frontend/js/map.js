// Configurações do mapa para cada cidade
const cityCoordinates = {
    'Chimoio': { 
        lat: -19.116394, 
        lng: 33.483333, 
        zoom: 13,
        bounds: [
            [-19.15, 33.45], // sudoeste
            [-19.08, 33.52]  // nordeste
        ]
    },
    'Beira': { 
        lat: -19.799999, 
        lng: 34.900000, 
        zoom: 13,
        bounds: [
            [-19.85, 34.85], // sudoeste
            [-19.75, 34.95]  // nordeste
        ]
    }
};

let map;
let currentMarkers = [];
let selectedLocation = null;

// Ícones personalizados para diferentes categorias
const categoryIcons = {
    'Acúmulo de Lixo': L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/783/783775.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    }),
    'Ruas Não Transitáveis': L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/984/984384.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    }),
    'Falha na Iluminação': L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/702/702814.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    }),
    'Buracos na Via': L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3208/3208726.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    }),
    'Vazamento de Água': L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/251/251831.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    }),
    'Outros': L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    })
};

// Inicializar mapa
function initMap() {
    const defaultCity = document.getElementById('citySelect').value;
    const coords = cityCoordinates[defaultCity];
    
    map = L.map('map').setView([coords.lat, coords.lng], coords.zoom);
    
    // Adicionar tile layer do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Definir limites aproximados para cada cidade
    if (coords.bounds) {
        map.setMaxBounds(coords.bounds);
    }
    
    // Evento de clique no mapa para selecionar localização
    map.on('click', function(e) {
        if (document.getElementById('reportModal').style.display === 'block') {
            selectLocation(e.latlng);
        }
    });
    
    loadProblems();
}

// Selecionar localização no mapa
function selectLocation(latlng) {
    selectedLocation = latlng;
    
    // Remover marcador anterior se existir
    if (window.locationMarker) {
        map.removeLayer(window.locationMarker);
    }
    
    // Adicionar novo marcador
    window.locationMarker = L.marker(latlng, {
        icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
            iconSize: [25, 25],
            iconAnchor: [12, 25]
        })
    }).addTo(map);
    
    document.getElementById('selectedLocation').textContent = 
        `Localização: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
}

// Carregar problemas do servidor
async function loadProblems(city = '', category = '', status = '') {
    try {
        let url = '/api/problems';
        const params = new URLSearchParams();
        
        if (city) params.append('city', city);
        if (category) params.append('category', category);
        if (status) params.append('status', status);
        
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao carregar problemas');
        }
        
        displayProblems(data.problems);
        
    } catch (error) {
        console.error('Erro ao carregar problemas:', error);
        showNotification('Erro ao carregar problemas: ' + error.message, 'error');
    }
}

// Exibir problemas no mapa
function displayProblems(problems) {
    // Limpar marcadores existentes
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];
    
    // Adicionar novos marcadores
    problems.forEach(problem => {
        const icon = categoryIcons[problem.category] || categoryIcons['Outros'];
        
        const marker = L.marker([problem.latitude, problem.longitude], { icon })
            .addTo(map)
            .bindPopup(createPopupContent(problem));
        
        currentMarkers.push(marker);
    });
    
    // Atualizar contador
    updateProblemCounter(problems.length);
}

// Criar conteúdo do popup
function createPopupContent(problem) {
    const statusText = getStatusText(problem.status);
    const statusClass = `status-${problem.status}`;
    
    return `
        <div class="marker-popup">
            <h3>${problem.title}</h3>
            <p><strong>Categoria:</strong> ${problem.category}</p>
            <p><strong>Status:</strong> <span class="status ${statusClass}">${statusText}</span></p>
            <p><strong>Descrição:</strong> ${problem.description}</p>
            <p><strong>Local:</strong> ${problem.city}</p>
            <p><strong>Data:</strong> ${new Date(problem.created_at).toLocaleDateString('pt-PT')}</p>
            <p><small>Reportado por: ${problem.user_name || 'Anônimo'}</small></p>
            ${problem.image_url ? `<img src="${problem.image_url}" alt="Imagem do problema">` : ''}
        </div>
    `;
}

// Atualizar contador de problemas
function updateProblemCounter(count) {
    const counter = document.getElementById('problemCounter');
    if (!counter) {
        // Criar contador se não existir
        const counterElement = document.createElement('div');
        counterElement.id = 'problemCounter';
        counterElement.style.cssText = `
            position: absolute;
            top: 100px;
            right: 10px;
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            font-weight: bold;
        `;
        document.getElementById('map').appendChild(counterElement);
    }
    
    document.getElementById('problemCounter').textContent = `📊 ${count} problemas encontrados`;
}

// Atualizar mapa
function refreshMap() {
    const city = document.getElementById('citySelect').value;
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    // Reposicionar mapa para a cidade selecionada
    const coords = cityCoordinates[city];
    map.setView([coords.lat, coords.lng], coords.zoom);
    
    if (coords.bounds) {
        map.setMaxBounds(coords.bounds);
    }
    
    loadProblems(city, category, status);
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

// Upload de imagem
function handleImageUpload(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (file) {
        // Verificar se é uma imagem
        if (!file.type.startsWith('image/')) {
            showNotification('Por favor, selecione um arquivo de imagem válido.', 'error');
            return;
        }
        
        // Verificar tamanho do arquivo (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('A imagem deve ter menos de 5MB.', 'error');
            return;
        }
        
        // Criar preview
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}