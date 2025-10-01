class Dashboard {
    constructor() {
        this.map = null;
        this.markers = [];
        this.selectedLocation = null;
        this.myProblems = [];
        
        this.init();
    }

    async init() {
        // Verificar autenticação
        if (!auth.isLoggedIn()) {
            window.location.href = '/login';
            return;
        }

        // Atualizar interface do usuário
        this.updateUserInfo();
        
        // Inicializar mapa
        this.initMap();
        
        // Carregar problemas do usuário
        await this.loadMyProblems();
        
        // Configurar event listeners
        this.setupEventListeners();
    }

    updateUserInfo() {
        const userWelcome = document.getElementById('userWelcome');
        const welcomeTitle = document.getElementById('welcomeTitle');
        const welcomeSubtitle = document.getElementById('welcomeSubtitle');
        
        if (auth.user) {
            userWelcome.textContent = `👋 Olá, ${auth.user.name}`;
            welcomeTitle.textContent = `Bem-vindo, ${auth.user.name}!`;
            welcomeSubtitle.textContent = `Email: ${auth.user.email} | ${auth.user.role === 'admin' ? 'Administrador' : 'Usuário'}`;
        }
    }

    initMap() {
        // Inicializar mapa centrado em Moçambique
        this.map = L.map('map').setView([-18.6657, 35.5296], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Adicionar evento de clique no mapa
        this.map.on('click', (e) => {
            this.selectLocation(e.latlng);
        });
    }

    selectLocation(latlng) {
        this.selectedLocation = latlng;
        
        const locationDiv = document.getElementById('selectedLocation');
        locationDiv.innerHTML = `
            🗺️ Localização selecionada: 
            <strong>Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}</strong>
        `;
        
        // Adicionar marcador temporário
        this.clearTempMarkers();
        
        const marker = L.marker(latlng)
            .addTo(this.map)
            .bindPopup('📍 Localização selecionada')
            .openPopup();
            
        this.tempMarker = marker;
    }

    clearTempMarkers() {
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
        }
    }

    clearProblemMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    async loadMyProblems() {
        try {
            const statusFilter = document.getElementById('statusFilter').value;
            const cityFilter = document.getElementById('cityFilter').value;
            
            let url = '/api/problems?';
            if (statusFilter !== 'all') url += `status=${statusFilter}&`;
            if (cityFilter !== 'all') url += `city=${cityFilter}&`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.ok) {
                // Filtrar apenas os problemas do usuário logado
                this.myProblems = data.problems.filter(problem => 
                    problem.user_id === auth.user.id
                );
                
                this.updateProblemsList();
                this.updateStats();
                this.updateMap();
            } else {
                this.showAlert('Erro ao carregar problemas', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            this.showAlert('Erro de conexão', 'error');
        }
    }

    updateProblemsList() {
        const problemsList = document.getElementById('problemsList');
        const noProblems = document.getElementById('noProblems');
        
        if (this.myProblems.length === 0) {
            problemsList.style.display = 'none';
            noProblems.style.display = 'block';
            return;
        }
        
        problemsList.style.display = 'grid';
        noProblems.style.display = 'none';
        
        problemsList.innerHTML = this.myProblems.map(problem => `
            <div class="problem-card ${problem.status}">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                    <h4 style="flex: 1; margin: 0;">${problem.title}</h4>
                    <span class="status-badge status-${problem.status}">
                        ${this.getStatusText(problem.status)}
                    </span>
                </div>
                
                <p style="color: #666; margin-bottom: 1rem;">${problem.description}</p>
                
                <div style="font-size: 0.9rem; color: #888;">
                    <div>🏙️ ${problem.city}</div>
                    <div>📅 ${new Date(problem.created_at).toLocaleDateString('pt-BR')}</div>
                    <div>📌 ${problem.category}</div>
                </div>
                
                ${problem.status !== 'resolved' ? `
                    <div style="margin-top: 1rem;">
                        <button onclick="dashboard.updateProblemStatus(${problem.id}, 'resolved')" 
                                class="btn btn-success" style="padding: 5px 10px; font-size: 12px;">
                            ✅ Marcar como Resolvido
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    updateStats() {
        document.getElementById('myProblemsCount').textContent = this.myProblems.length;
        document.getElementById('resolvedCount').textContent = 
            this.myProblems.filter(p => p.status === 'resolved').length;
        document.getElementById('progressCount').textContent = 
            this.myProblems.filter(p => p.status === 'in_progress').length;
    }

    updateMap() {
        this.clearProblemMarkers();
        
        this.myProblems.forEach(problem => {
            const marker = L.marker([problem.latitude, problem.longitude])
                .addTo(this.map)
                .bindPopup(`
                    <strong>${problem.title}</strong><br>
                    ${problem.description}<br>
                    <small>Status: ${this.getStatusText(problem.status)}</small>
                `);
                
            // Cor diferente baseada no status
            let color = 'blue';
            if (problem.status === 'resolved') color = 'green';
            if (problem.status === 'in_progress') color = 'orange';
            if (problem.status === 'reported') color = 'red';
            
            marker.setIcon(
                L.divIcon({
                    className: `custom-marker ${problem.status}`,
                    html: `<div style="background: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>`,
                    iconSize: [20, 20]
                })
            );
            
            this.markers.push(marker);
        });
        
        // Ajustar zoom para mostrar todos os marcadores
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    getStatusText(status) {
        const statusMap = {
            'reported': 'Reportado',
            'in_progress': 'Em Progresso',
            'resolved': 'Resolvido'
        };
        return statusMap[status] || status;
    }

    async updateProblemStatus(problemId, newStatus) {
        if (!confirm('Tem certeza que deseja atualizar o status deste problema?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/problems/${problemId}/status`, {
                method: 'PUT',
                headers: auth.getAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showAlert('Status atualizado com sucesso!', 'success');
                await this.loadMyProblems(); // Recarregar a lista
            } else {
                this.showAlert(data.error, 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            this.showAlert('Erro de conexão', 'error');
        }
    }

    setupEventListeners() {
        // Formulário de reportar problema
        document.getElementById('reportForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleReportProblem();
        });
    }

    async handleReportProblem() {
        if (!this.selectedLocation) {
            alert('Por favor, selecione uma localização no mapa primeiro.');
            return;
        }
        
        const problemData = {
            title: document.getElementById('reportTitle').value,
            description: document.getElementById('reportDesc').value,
            category: document.getElementById('reportCategory').value,
            city: document.getElementById('reportCity').value,
            latitude: this.selectedLocation.lat,
            longitude: this.selectedLocation.lng
        };
        
        try {
            const response = await fetch('/api/problems', {
                method: 'POST',
                headers: auth.getAuthHeaders(),
                body: JSON.stringify(problemData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showAlert('Problema reportado com sucesso!', 'success');
                this.hideModal();
                await this.loadMyProblems();
                
                // Reset form
                document.getElementById('reportForm').reset();
                this.selectedLocation = null;
                document.getElementById('selectedLocation').textContent = '🗺️ Clique no mapa para selecionar a localização';
                this.clearTempMarkers();
            } else {
                this.showAlert(data.error, 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            this.showAlert('Erro de conexão', 'error');
        }
    }

    showReportForm() {
        document.getElementById('reportModal').style.display = 'flex';
    }

    hideModal() {
        document.getElementById('reportModal').style.display = 'none';
    }

    showAlert(message, type) {
        // Criar alerta temporário
        const alert = document.createElement('div');
        alert.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
        alert.textContent = message;
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '10000';
        alert.style.minWidth = '300px';
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Inicializar dashboard quando a página carregar
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});

// Funções globais para os botões HTML
function showReportForm() {
    dashboard.showReportForm();
}

function hideModal() {
    dashboard.hideModal();
}

function loadMyProblems() {
    dashboard.loadMyProblems();
}