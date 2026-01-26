// ========================================
// NephroGuard Pro - Enhanced Interactive Dashboard
// ========================================

// DOM Elements
const clinicalForm = document.getElementById('clinical-form');
const predictBtn = document.getElementById('predict-btn');
const analyticsPanel = document.getElementById('analytics-panel');
const loadingOverlay = document.getElementById('loading-overlay');
const aiFab = document.getElementById('ai-fab');
const aiChatWindow = document.getElementById('ai-chat-window');
const chatClose = document.getElementById('chat-close');
const chatMessages = document.getElementById('chat-messages');
const chatInputField = document.getElementById('chat-input-field');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const logoutBtn = document.getElementById('logout-btn');
const refreshLocationBtn = document.getElementById('refresh-location');
const currentLocationElement = document.getElementById('current-location');
const refreshHospitalsBtn = document.getElementById('refresh-hospitals');
const hospitalList = document.getElementById('hospital-list');

// State
let userLocation = { lat: null, lng: null, address: null };
let hospitals = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadTheme();
    getCurrentLocation();
    loadUserData();
});

// Initialize Dashboard
function initializeDashboard() {
    // Set default values for demonstration
    setDefaultValues();
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
}

// Load User Data
function loadUserData() {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userName) {
        document.getElementById('user-name').textContent = userName;
    }
}

// Set Default Values
function setDefaultValues() {
    const form = document.getElementById('clinical-form');
    form.querySelector('[name="age"]').value = 45;
    form.querySelector('[name="gender"]').value = 'male';
    form.querySelector('[name="weight"]').value = 75;
    form.querySelector('[name="height"]').value = 172;
    form.querySelector('[name="bmi"]').value = 25.3;
    form.querySelector('[name="bp_systolic"]').value = 138;
    form.querySelector('[name="bp_diastolic"]').value = 88;
    form.querySelector('[name="creatinine"]').value = 1.4;
    form.querySelector('[name="bun"]').value = 22;
    form.querySelector('[name="egfr"]').value = 58;
    form.querySelector('[name="hemoglobin"]').value = 12.8;
    form.querySelector('[name="albumin"]').value = 3.8;
    form.querySelector('[name="calcium"]').value = 9.2;
    form.querySelector('[name="phosphorus"]').value = 4.1;
    form.querySelector('[name="urine_albumin"]').value = 45;
    form.querySelector('[name="glucose_fasting"]').value = 105;
    form.querySelector('[name="hba1c"]').value = 6.8;
    form.querySelector('[name="cholesterol"]').value = 215;
    form.querySelector('[name="ldl"]').value = 142;
    form.querySelector('[name="triglycerides"]').value = 168;
    form.querySelector('[name="sodium"]').value = 139;
    form.querySelector('[name="potassium"]').value = 4.6;
}

// Setup Event Listeners
function setupEventListeners() {
    // Form submission
    clinicalForm.addEventListener('submit', handlePredict);
    
    // AI Assistant
    aiFab.addEventListener('click', toggleChatWindow);
    chatClose.addEventListener('click', closeChatWindow);
    sendBtn.addEventListener('click', sendMessage);
    chatInputField.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Reset button
    document.querySelector('.btn-secondary').addEventListener('click', resetForm);
    
    // Sidebar navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            this.closest('.nav-item').classList.add('active');
        });
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Location refresh
    refreshLocationBtn.addEventListener('click', getCurrentLocation);
    refreshHospitalsBtn.addEventListener('click', loadNearbyHospitals);
    
    // Hospital navigation buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-navigate')) {
            const btn = e.target.closest('.btn-navigate');
            const lat = btn.dataset.lat;
            const lng = btn.dataset.lng;
            const name = btn.dataset.name;
            navigateToHospital(lat, lng, name);
        }
        
        if (e.target.closest('.btn-call')) {
            const btn = e.target.closest('.btn-call');
            const phone = btn.dataset.phone;
            callHospital(phone);
        }
    });
}

// Theme Management
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    } else {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

// Logout Functionality
function handleLogout() {
    // Show confirmation
    if (confirm('Are you sure you want to logout?')) {
        // Clear session
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('rememberMe');
        
        // Redirect to login
        window.location.href = 'login.html';
    }
}

// Location Management
function getCurrentLocation() {
    if (!navigator.geolocation) {
        currentLocationElement.textContent = 'Geolocation not supported';
        return;
    }
    
    currentLocationElement.textContent = 'Detecting...';
    refreshLocationBtn.disabled = true;
    refreshLocationBtn.querySelector('i').classList.add('fa-spin');
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            userLocation.lat = position.coords.latitude;
            userLocation.lng = position.coords.longitude;
            
            // Reverse geocoding to get address
            getAddressFromCoordinates(userLocation.lat, userLocation.lng);
            
            // Load nearby hospitals
            loadNearbyHospitals();
            
            refreshLocationBtn.disabled = false;
            refreshLocationBtn.querySelector('i').classList.remove('fa-spin');
        },
        function(error) {
            console.error('Geolocation error:', error);
            currentLocationElement.textContent = 'Location access denied';
            refreshLocationBtn.disabled = false;
            refreshLocationBtn.querySelector('i').classList.remove('fa-spin');
            
            // Load hospitals with default location
            userLocation.lat = 40.7128; // Default to NYC
            userLocation.lng = -74.0060;
            userLocation.address = 'New York, NY (Default)';
            currentLocationElement.textContent = userLocation.address;
            loadNearbyHospitals();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

async function getAddressFromCoordinates(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        
        if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || '';
            const state = data.address.state || '';
            const country = data.address.country || '';
            userLocation.address = `${city}, ${state}, ${country}`;
            currentLocationElement.textContent = userLocation.address;
        } else {
            userLocation.address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            currentLocationElement.textContent = userLocation.address;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        userLocation.address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        currentLocationElement.textContent = userLocation.address;
    }
}

// Hospital Management
function loadNearbyHospitals() {
    if (!userLocation.lat || !userLocation.lng) {
        getCurrentLocation();
        return;
    }
    
    // Simulate hospital data (in production, use Google Places API or similar)
    hospitals = [
        {
            name: 'City Medical Center',
            address: '123 Healthcare Blvd, Suite 200',
            phone: '2125551234',
            lat: userLocation.lat + 0.01,
            lng: userLocation.lng + 0.01,
            rating: 4.8,
            reviews: 120
        },
        {
            name: 'General Hospital',
            address: '456 Medical Plaza, Floor 5',
            phone: '2125555678',
            lat: userLocation.lat - 0.02,
            lng: userLocation.lng + 0.015,
            rating: 4.6,
            reviews: 98
        },
        {
            name: 'Nephrology Clinic',
            address: '789 Kidney Care Lane, Suite 10',
            phone: '2125559012',
            lat: userLocation.lat + 0.005,
            lng: userLocation.lng - 0.02,
            rating: 4.9,
            reviews: 85
        },
        {
            name: 'University Medical Center',
            address: '321 Academic Drive, Building A',
            phone: '2125553456',
            lat: userLocation.lat - 0.01,
            lng: userLocation.lng - 0.01,
            rating: 4.7,
            reviews: 150
        },
        {
            name: 'Community Health Hospital',
            address: '654 Wellness Street, Main Campus',
            phone: '2125557890',
            lat: userLocation.lat + 0.015,
            lng: userLocation.lng + 0.02,
            rating: 4.5,
            reviews: 75
        }
    ];
    
    // Calculate distances and sort
    hospitals.forEach(hospital => {
        hospital.distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            hospital.lat,
            hospital.lng
        );
    });
    
    hospitals.sort((a, b) => a.distance - b.distance);
    
    // Display hospitals
    displayHospitals();
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function displayHospitals() {
    hospitalList.innerHTML = '';
    
    hospitals.slice(0, 5).forEach(hospital => {
        const card = document.createElement('div');
        card.className = 'hospital-card';
        
        card.innerHTML = `
            <div class="hospital-info">
                <h4><i class="fas fa-hospital"></i> ${hospital.name}</h4>
                <p class="hospital-address">${hospital.address}</p>
                <p class="hospital-distance"><i class="fas fa-route"></i> ${hospital.distance.toFixed(1)} km away</p>
                <p class="hospital-rating"><i class="fas fa-star"></i> ${hospital.rating} (${hospital.reviews} reviews)</p>
            </div>
            <div class="hospital-actions">
                <button class="btn btn-navigate" data-lat="${hospital.lat}" data-lng="${hospital.lng}" data-name="${hospital.name}">
                    <i class="fas fa-directions"></i> Navigate
                </button>
                <button class="btn btn-call" data-phone="${hospital.phone}">
                    <i class="fas fa-phone"></i> Call
                </button>
            </div>
        `;
        
        hospitalList.appendChild(card);
    });
}

function navigateToHospital(lat, lng, name) {
    // Open in Google Maps
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
    
    // Show notification
    addChatMessage('ai', `Opening navigation to ${name}. This will open in a new tab.`);
}

function callHospital(phone) {
    window.location.href = `tel:${phone}`;
    addChatMessage('ai', `Dialing hospital at ${phone}...`);
}

// Handle Predict Function
function handlePredict(e) {
    e.preventDefault();
    
    // Show loading overlay
    loadingOverlay.classList.add('active');
    
    // Disable button
    predictBtn.disabled = true;
    predictBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    // Simulate AI processing
    setTimeout(() => {
        // Hide loading overlay
        loadingOverlay.classList.remove('active');
        
        // Enable button
        predictBtn.disabled = false;
        predictBtn.innerHTML = '<i class="fas fa-brain"></i> Generate Clinical Report';
        
        // Show analytics panel with animation
        analyticsPanel.classList.add('visible');
        
        // Update results with random data
        updateResults();
        
        // Scroll to analytics panel
        analyticsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Show success message in chat
        addChatMessage('ai', 'I\'ve analyzed your clinical data. The results are now displayed in the analytics panel. Would you like me to explain any specific findings?');
    }, 2500);
}

// Update Results
function updateResults() {
    // Update confidence score
    const confidenceValue = document.getElementById('confidence-value');
    const confidence = Math.floor(Math.random() * (95 - 70) + 70);
    confidenceValue.textContent = confidence + '%';
    
    // Update gauge color based on confidence
    const gauge = document.querySelector('.gauge');
    const hue = (confidence - 70) / 25 * 120; // Green to red
    gauge.style.background = `conic-gradient(
        hsl(${180 - hue}, 70%, 50%) 0%,
        hsl(${180 - hue}, 70%, 50%) ${confidence}%,
        rgba(255, 255, 255, 0.1) ${confidence}%
    )`;
    
    // Update CKD stage
    updateCKDStage();
    
    // Update SHAP values
    updateShapValues();
}

// CKD Stages Data
const ckdStages = [
    { stage: 'Stage 1', detail: '(Normal/Mild)', color: '#10b981', glow: '#10b981' },
    { stage: 'Stage 2', detail: '(Mild)', color: '#3b82f6', glow: '#3b82f6' },
    { stage: 'Stage 3a', detail: '(Mild to Moderate)', color: '#f59e0b', glow: '#f59e0b' },
    { stage: 'Stage 3b', detail: '(Moderate to Severe)', color: '#f97316', glow: '#f97316' },
    { stage: 'Stage 4', detail: '(Severe)', color: '#ef4444', glow: '#ef4444' },
    { stage: 'Stage 5', detail: '(Kidney Failure)', color: '#dc2626', glow: '#dc2626' }
];

// Update CKD Stage
function updateCKDStage() {
    const stageIndex = Math.floor(Math.random() * ckdStages.length);
    const stageData = ckdStages[stageIndex];
    
    const stageBadge = document.getElementById('stage-badge');
    const stageText = stageBadge.querySelector('.stage-text');
    const stageDetail = stageBadge.querySelector('.stage-detail');
    
    stageText.textContent = stageData.stage;
    stageDetail.textContent = stageData.detail;
    
    // Update color and glow
    stageBadge.style.background = `linear-gradient(135deg, ${stageData.color}20 0%, ${stageData.color}20 100%)`;
    stageBadge.style.borderColor = `${stageData.color}40`;
    stageText.style.color = stageData.color;
    stageText.style.textShadow = `0 0 20px ${stageData.glow}80`;
    
    const stageGlow = stageBadge.querySelector('.stage-glow');
    stageGlow.style.background = `linear-gradient(135deg, ${stageData.color}, #00d4ff)`;
    stageGlow.style.boxShadow = `0 0 30px ${stageData.glow}80`;
}

// SHAP Factors Data
const shapFactors = [
    { name: 'Creatinine', value: 0.85 },
    { name: 'Age', value: 0.65 },
    { name: 'BP Systolic', value: 0.55 },
    { name: 'Hemoglobin', value: -0.45 },
    { name: 'Diabetes', value: 0.35 },
    { name: 'Albumin', value: -0.25 },
    { name: 'eGFR', value: -0.75 }
];

// Update SHAP Values
function updateShapValues() {
    const shapChart = document.getElementById('shap-chart');
    shapChart.innerHTML = '';
    
    // Shuffle and select top 5 factors
    const shuffled = [...shapFactors].sort(() => Math.random() - 0.5);
    const topFactors = shuffled.slice(0, 5);
    
    topFactors.forEach(factor => {
        const bar = document.createElement('div');
        bar.className = 'shap-bar';
        
        const label = document.createElement('span');
        label.className = 'bar-label';
        label.textContent = factor.name;
        
        const container = document.createElement('div');
        container.className = 'bar-container';
        
        const fill = document.createElement('div');
        fill.className = `bar-fill ${factor.value >= 0 ? 'positive' : 'negative'}`;
        fill.style.width = '0%';
        
        const value = document.createElement('span');
        value.className = 'bar-value';
        value.textContent = (factor.value >= 0 ? '+' : '') + factor.value.toFixed(2);
        
        container.appendChild(fill);
        bar.appendChild(label);
        bar.appendChild(container);
        bar.appendChild(value);
        shapChart.appendChild(bar);
        
        // Animate bar width
        setTimeout(() => {
            fill.style.width = Math.abs(factor.value) * 100 + '%';
        }, 100);
    });
}

// Toggle Chat Window
function toggleChatWindow() {
    aiChatWindow.classList.toggle('active');
    
    if (aiChatWindow.classList.contains('active')) {
        chatInputField.focus();
    }
}

// Close Chat Window
function closeChatWindow() {
    aiChatWindow.classList.remove('active');
}

// Send Message
function sendMessage() {
    const message = chatInputField.value.trim();
    
    if (message) {
        // Add user message
        addChatMessage('user', message);
        
        // Clear input
        chatInputField.value = '';
        
        // Simulate AI response
        setTimeout(() => {
            const response = generateAIResponse(message);
            addChatMessage('ai', response);
        }, 1000);
    }
}

// Add Chat Message
function addChatMessage(type, content) {
    const message = document.createElement('div');
    message.className = `message ${type}-message`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = `<p>${content}</p>`;
    
    message.appendChild(messageContent);
    chatMessages.appendChild(message);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Generate AI Response
function generateAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword-based responses
    if (lowerMessage.includes('ckd') || lowerMessage.includes('chronic kidney')) {
        return "CKD, or Chronic Kidney Disease, is a gradual loss of kidney function over time. Based on the clinical data you've entered, I can help assess the stage and provide recommendations for management.";
    } else if (lowerMessage.includes('stage')) {
        return "CKD has 5 stages based on eGFR levels. Stage 1 is normal function (eGFR >90), while Stage 5 is kidney failure (eGFR <15). Your current analysis shows Stage 3, which requires careful monitoring and lifestyle modifications.";
    } else if (lowerMessage.includes('diet') || lowerMessage.includes('food')) {
        return "For CKD patients, I recommend limiting sodium intake (<2,000mg/day), controlling protein consumption, and reducing foods high in phosphorus and potassium. Working with a renal dietitian can create a personalized meal plan.";
    } else if (lowerMessage.includes('symptom')) {
        return "Common CKD symptoms include fatigue, swelling in hands and feet, changes in urination frequency, nausea, and difficulty concentrating. In early stages, symptoms may not be noticeable, which is why regular screening is important.";
    } else if (lowerMessage.includes('treatment') || lowerMessage.includes('manage')) {
        return "CKD management includes blood pressure control, diabetes management, medications like ACE inhibitors or ARBs, lifestyle changes, and in advanced stages, dialysis or kidney transplant may be necessary.";
    } else if (lowerMessage.includes('hospital') || lowerMessage.includes('doctor') || lowerMessage.includes('specialist')) {
        return "I've identified several nearby nephrology specialists and hospitals in your area. You can use the navigation buttons to get directions or call them directly. The nearest specialist is just a few kilometers away.";
    } else if (lowerMessage.includes('location') || lowerMessage.includes('where')) {
        return `Your current location is: ${userLocation.address || 'Detecting...'}. I've loaded nearby hospitals based on your location. Click the refresh button if you need to update your location.`;
    } else {
        return "Thank you for your question. As an AI assistant specialized in kidney health, I can help you understand CKD stages, symptoms, treatment options, lifestyle recommendations, and find nearby healthcare providers. What specific aspect would you like to learn more about?";
    }
}

// Reset Form
function resetForm() {
    clinicalForm.reset();
    analyticsPanel.classList.remove('visible');
    
    // Show confirmation
    addChatMessage('ai', 'Form has been reset. You can enter new patient data when ready.');
}

// Utility function to calculate BMI
function calculateBMI(weight, height) {
    if (weight && height) {
        const heightInMeters = height / 100;
        return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return '';
}

// Auto-calculate BMI when weight or height changes
document.querySelectorAll('[name="weight"], [name="height"]').forEach(input => {
    input.addEventListener('change', function() {
        const weight = document.querySelector('[name="weight"]').value;
        const height = document.querySelector('[name="height"]').value;
        const bmiField = document.querySelector('[name="bmi"]');
        
        if (weight && height) {
            bmiField.value = calculateBMI(parseFloat(weight), parseFloat(height));
        }
    });
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!predictBtn.disabled) {
            handlePredict(e);
        }
    }
    
    // Escape to close chat
    if (e.key === 'Escape') {
        closeChatWindow();
    }
});

// Console welcome message
console.log('%c NephroGuard Pro Dashboard ', 'background: linear-gradient(135deg, #00d4ff, #3b82f6); color: #ffffff; padding: 10px 20px; font-size: 16px; font-weight: bold; border-radius: 5px;');
console.log('Enhanced CKD Analytics Dashboard v2.0');
console.log('Features: Location Tracking, Theme Toggle, Hospital Locator');
console.log('For support, contact: support@nephroguardpro.com');