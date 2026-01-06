

// ========== JAVASCRIPT COMPLET ==========

// Configuration des API
// Configuration des API
const API_CONFIG = {
    BASE_URL: "https://shopnet-backend.onrender.com", // Serveur Render (production, actif)
    // BASE_URL: "http://100.64.134.89:5000", // Serveur LOCAL (commenté)cd
    ENDPOINTS: {
        UTILISATEURS: "/api/admin/dashboard",
        PRODUITS: "/api/admin/dashboard",
        COMMANDES: "/admin/dashboard/commandes"
    }
};


// Variables globales
let currentSection = "utilisateurs";
let growthChart = null;
let mostViewedChart = null;
let categoriesChart = null;
let chartsInitialized = {
    utilisateurs: false,
    produits: false,
    commandes: false
};

// ========== FONCTIONS UTILITAIRES ==========

function formatNumber(num) {
    if (!num && num !== 0) return "0";
    num = parseFloat(num);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
}

function formatUSD(value) {
    if (isNaN(value) || value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// ========== GESTION DES SECTIONS ==========

function switchSection(sectionId) {
    // Mettre à jour le menu
    document.querySelectorAll('.sidebar nav li').forEach(li => {
        li.classList.remove('active');
    });
    const link = document.querySelector(`.sidebar nav li a[data-section="${sectionId}"]`);
    if (link) {
        link.parentElement.classList.add('active');
    }
    
    // Cacher toutes les sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher la section sélectionnée
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionId;
        
        // Initialiser les données de la section si nécessaire
        if (!chartsInitialized[sectionId]) {
            loadSectionData(sectionId);
            chartsInitialized[sectionId] = true;
        } else {
            // Recharger les données pour être à jour
            loadSectionData(sectionId);
        }
    }
    
    // Fermer le menu mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
    }
}

// ========== DONNÉES UTILISATEURS ==========

async function loadUserData() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UTILISATEURS}`);
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Mettre à jour les statistiques
        document.getElementById("total-users").innerText = formatNumber(data.totalUsers || 0);
        document.getElementById("new-users-today").innerText = formatNumber(data.newToday || 0);
        document.getElementById("new-users-week").innerText = formatNumber(data.newWeek || 0);
        document.getElementById("new-users-month").innerText = formatNumber(data.newMonth || 0);
        document.getElementById("daily-active").innerText = formatNumber(data.dailyActive || 0);
        document.getElementById("monthly-active").innerText = formatNumber(data.monthlyActive || 0);
        
        // Tableau activité par ville
        const tableBody = document.getElementById("activity-table").querySelector("tbody");
        tableBody.innerHTML = "";
        
        if (data.activityByLocation && data.activityByLocation.length > 0) {
            data.activityByLocation.forEach(loc => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${loc.city || "Non défini"}</td>
                    <td>${formatNumber(loc.users || 0)}</td>
                    <td>${formatNumber(loc.connections || 0)}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 20px; color: #8892B0;">
                        Aucune donnée disponible
                    </td>
                </tr>
            `;
        }
        
        // Graphique croissance
        if (growthChart) {
            growthChart.destroy();
        }
        
        const ctx = document.getElementById('growth-chart').getContext('2d');
        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.growth ? data.growth.map(g => g.date) : [],
                datasets: [{
                    label: 'Croissance utilisateurs',
                    data: data.growth ? data.growth.map(g => g.count) : [],
                    borderColor: '#0A84FF',
                    backgroundColor: 'rgba(10, 132, 255, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        display: false 
                    } 
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#B0C4DE'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#B0C4DE',
                            callback: function(value) {
                                return formatNumber(value);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error("Erreur Dashboard Utilisateurs:", error);
        showError("section-utilisateurs", "Impossible de charger les données utilisateurs");
    }
}

// ========== DONNÉES PRODUITS ==========

async function loadProductData() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUITS}`);
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Statistiques produits
        document.getElementById("total-products").textContent = formatNumber(data.totalProducts || 0);
        document.getElementById("products-today").textContent = formatNumber(data.productsThisMonth || 0);
        document.getElementById("products-deleted").textContent = formatNumber(data.deletedProducts || 0);
        document.getElementById("products-blocked").textContent = formatNumber(data.blockedProducts || 0);
        document.getElementById("active-categories").textContent = formatNumber(data.activeCategories || 0);
        document.getElementById("new-vendors-today").textContent = formatNumber(data.newVendorsToday || 0);
        
        // Produits les plus vus
        if (mostViewedChart) {
            mostViewedChart.destroy();
        }
        
        if (data.mostViewed && data.mostViewed.length > 0) {
            const ctx1 = document.getElementById('most-viewed-chart').getContext('2d');
            mostViewedChart = new Chart(ctx1, {
                type: "bar",
                data: {
                    labels: data.mostViewed.map(p => p.title ? p.title.substring(0, 20) + (p.title.length > 20 ? '...' : '') : 'Produit'),
                    datasets: [{
                        label: "Vues",
                        data: data.mostViewed.map(p => p.views_count || 0),
                        backgroundColor: "#0A84FF",
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            ticks: { 
                                color: "#FFFFFF",
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: { 
                            ticks: { 
                                color: "#FFFFFF",
                                maxRotation: 45
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    }
                }
            });
        }
        
        // Catégories
        if (categoriesChart) {
            categoriesChart.destroy();
        }
        
        if (data.categories && data.categories.length > 0) {
            const ctx2 = document.getElementById('categories-chart').getContext('2d');
            categoriesChart = new Chart(ctx2, {
                type: "pie",
                data: {
                    labels: data.categories.map(c => c.category || 'Catégorie'),
                    datasets: [{
                        data: data.categories.map(c => c.count || 0),
                        backgroundColor: [
                            "#0A84FF", "#1E90FF", "#3CB371", "#FF8C00", 
                            "#FF4500", "#9B59B6", "#E74C3C", "#2ECC71", 
                            "#F1C40F", "#3498DB"
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: "bottom", 
                            labels: { 
                                color: "#FFFFFF",
                                font: {
                                    size: 12
                                }
                            } 
                        }
                    }
                }
            });
        }
        
        // Top vendeurs
        const tbody = document.querySelector("#top-sellers-table tbody");
        if (data.topSellers && data.topSellers.length > 0) {
            tbody.innerHTML = "";
            data.topSellers.forEach(seller => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${seller.seller_name || 'Vendeur inconnu'}</td>
                    <td>${formatNumber(seller.products_count || 0)}</td>
                    <td>${formatNumber(seller.total_views || 0)}</td>
                    <td>${parseFloat(seller.avg_likes || 0).toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #8892B0;">
                        Aucun vendeur trouvé
                    </td>
                </tr>
            `;
        }
        
    } catch (err) {
        console.error("Erreur fetchDashboard Produits:", err);
        showError("section-produits", "Impossible de charger les données produits");
    }
}

// ========== DONNÉES COMMANDES ==========

async function loadOrderData() {
    try {
        setLoading(true);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COMMANDES}`);
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.stats) {
            const stats = data.stats;
            
            // Mettre à jour les statistiques
            document.getElementById("total-orders").textContent = formatNumber(stats.totalOrders || 0);
            document.getElementById("paid-orders").textContent = formatNumber(stats.totalPaidOrders || 0);
            
            // Calculer le pourcentage de commandes payées
            const percentage = stats.totalOrders > 0 ? 
                ((stats.totalPaidOrders / stats.totalOrders) * 100).toFixed(1) : 100;
            document.getElementById("orders-percentage").textContent = `${percentage}%`;
            
            // Montants
            document.getElementById("total-amount").textContent = formatUSD(stats.totalAmount || 0);
            document.getElementById("paid-amount").textContent = formatUSD(stats.totalPaidAmount || 0);
            
            // Calculer le panier moyen
            const averageOrder = stats.totalOrders > 0 ? 
                (parseFloat(stats.totalAmount) / stats.totalOrders) : 0;
            document.getElementById("average-order").textContent = formatUSD(averageOrder);
            
            // Mettre à jour le tableau détaillé
            updateDetailedStats(stats, averageOrder);
            
            // Mettre à jour l'heure
            updateLastUpdateTime();
        } else {
            throw new Error("Format de données invalide");
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des données commandes:', error);
        showError("section-commandes", "Impossible de charger les données commandes");
        
        // Afficher des données vides
        document.getElementById("total-orders").textContent = "0";
        document.getElementById("paid-orders").textContent = "0";
        document.getElementById("orders-percentage").textContent = "0%";
        document.getElementById("total-amount").textContent = formatUSD(0);
        document.getElementById("paid-amount").textContent = formatUSD(0);
        document.getElementById("average-order").textContent = formatUSD(0);
        
        const tbody = document.getElementById('detailed-stats-body');
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 20px; color: #FF5722;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p style="margin-top: 10px;">Erreur de chargement des données</p>
                </td>
            </tr>
        `;
        
    } finally {
        setLoading(false);
    }
}

function updateDetailedStats(stats, averageOrder) {
    const tbody = document.getElementById('detailed-stats-body');
    tbody.innerHTML = '';
    
    const metrics = [
        { label: "Commandes totales", value: formatNumber(stats.totalOrders), desc: "Nombre total de commandes passées" },
        { label: "Commandes payées", value: formatNumber(stats.totalPaidOrders), desc: "Nombre de commandes réglées" },
        { label: "Taux de paiement", value: `${((stats.totalPaidOrders / stats.totalOrders) * 100 || 0).toFixed(1)}%`, desc: "Pourcentage de commandes payées" },
        { label: "Chiffre d'affaires total", value: formatUSD(stats.totalAmount), desc: "Montant total des commandes" },
        { label: "Montant payé total", value: formatUSD(stats.totalPaidAmount), desc: "Montant total réglé" },
        { label: "Panier moyen", value: formatUSD(averageOrder), desc: "Montant moyen par commande" },
        { label: "Commandes en attente", value: formatNumber(stats.totalOrders - stats.totalPaidOrders), desc: "Commandes non encore payées" },
        { label: "Montant en attente", value: formatUSD(parseFloat(stats.totalAmount) - parseFloat(stats.totalPaidAmount || 0)), desc: "Montant restant à régler" }
    ];
    
    metrics.forEach(metric => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${metric.label}</strong></td>
            <td><span style="color: #0A84FF;">${metric.value}</span></td>
            <td style="color: #8892B0;">${metric.desc}</td>
        `;
        tbody.appendChild(row);
    });
}

function setLoading(isLoading) {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        if (isLoading) {
            refreshBtn.classList.add('loading');
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
            refreshBtn.disabled = true;
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Rafraîchir';
            refreshBtn.disabled = false;
        }
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeElement = document.getElementById('last-update-time');
    if (timeElement) {
        const timeString = now.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateString = now.toLocaleDateString('fr-FR');
        timeElement.textContent = `Dernière mise à jour: ${dateString} à ${timeString}`;
    }
}

// ========== GESTION DES ERREURS ==========

function showError(sectionId, message) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    // Supprimer les anciens messages d'erreur
    const oldError = section.querySelector('.error-message');
    if (oldError) oldError.remove();
    
    // Créer le message d'erreur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        color: #F44336;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
    `;
    
    // Insérer après le header
    const header = section.querySelector('header');
    if (header) {
        header.parentNode.insertBefore(errorDiv, header.nextSibling);
    }
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}

// ========== CHARGEMENT DES SECTIONS ==========

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'utilisateurs':
            loadUserData();
            break;
        case 'produits':
            loadProductData();
            break;
        case 'commandes':
            loadOrderData();
            break;
        default:
            // Pas de données à charger pour les autres sections
            break;
    }
}

// ========== ÉVÉNEMENTS ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard SHOPNET initialisé');
    
    // Charger les données initiales pour la section active
    loadSectionData(currentSection);
    
    // Gestion des clics sur le menu
    document.querySelectorAll('.sidebar nav li a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            switchSection(sectionId);
        });
    });
    
    // Bouton rafraîchir
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loadSectionData(currentSection);
        });
    }
    
    // Menu mobile
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // Auto-refresh toutes les 60 secondes pour la section active
    setInterval(() => {
        if (currentSection !== 'admins' && currentSection !== 'activites') {
            loadSectionData(currentSection);
        }
    }, 60000);
});

// Gestion du redimensionnement
window.addEventListener('resize', function() {
    // Redessiner les graphiques pour s'adapter à la nouvelle taille
    if (growthChart) growthChart.resize();
    if (mostViewedChart) mostViewedChart.resize();
    if (categoriesChart) categoriesChart.resize();
});