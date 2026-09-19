import { translations } from './i18n.js';

// ============================================
// STATE & PERSISTENCE
// ============================================
let currentLang = localStorage.getItem('portfolio-lang') || 'es';
let soundEnabled = localStorage.getItem('portfolio-sound') !== 'false';
let activeTheme = localStorage.getItem('portfolio-theme') || 'matrix';
let radarChartInstance = null;
let activeKpiKey = null;

const themeAvatars = {
    'matrix': 'images/michael-avatar-matrix.jpg',
    'sunset': 'images/michael-avatar-sunset.jpg',
    'cyberpunk': 'images/michael-avatar-cyberpunk.jpg',
    'night': 'images/michael-avatar-night.jpg',
    'dim': 'images/michael-avatar-dim.jpg'
};

// ============================================
// WEB AUDIO API SYNTHESIZER
// ============================================
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
}

function playSound(type = 'click') {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'msg') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'terminal') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'theme') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(350, now);
            osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch (e) {
        // Audio policy ignore
    }
}

function updateSoundUI() {
    const soundIconOn = document.getElementById('sound-icon-on');
    const soundIconOff = document.getElementById('sound-icon-off');
    if (soundIconOn && soundIconOff) {
        if (soundEnabled) {
            soundIconOn.style.display = 'block';
            soundIconOff.style.display = 'none';
        } else {
            soundIconOn.style.display = 'none';
            soundIconOff.style.display = 'block';
        }
    }
}

// ============================================
// TRANSLATION ENGINE & I18N
// ============================================
function t(key) {
    const dict = translations[currentLang] || translations.es;
    return dict[key] || key;
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('portfolio-lang', lang);
    document.documentElement.setAttribute('lang', lang);

    const langFlag = document.getElementById('lang-flag');
    const langText = document.getElementById('lang-text');
    if (langFlag && langText) {
        langFlag.textContent = lang === 'es' ? '🇩🇴' : '🇺🇸';
        langText.textContent = lang.toUpperCase();
    }

    // Translate static attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (text) el.innerHTML = text;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const text = t(key);
        if (text) el.setAttribute('placeholder', text);
    });

    // Re-render project cards with translated descriptions and buttons
    const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
    const filtered = activeFilter === 'all' ? allProjects : allProjects.filter(p => p.category === activeFilter);
    renderProjects(filtered);

    // Update terminal welcome text
    const termWelcome = document.getElementById('terminal-welcome-text');
    if (termWelcome) {
        termWelcome.innerHTML = currentLang === 'en'
            ? `🚀 Michael Franco Interactive Terminal v2.5<br>Type <span class="term-hl">'help'</span> to view available commands.`
            : `🚀 Michael Franco Interactive Terminal v2.5<br>Escribe <span class="term-hl">'help'</span> para ver los comandos disponibles.`;
    }

    renderChatbotQuickChips();
    initOrUpdateRadarChart();
}

// ============================================
// THEME SWITCHER
// ============================================
function applyTheme(theme) {
    activeTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio-theme', theme);

    const themeOptions = document.querySelectorAll('.theme-option');
    if (themeOptions) {
        themeOptions.forEach(opt => {
            if (opt.dataset.setTheme === theme) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    const heroImg = document.querySelector('.hero-avatar-circle img');
    if (heroImg && themeAvatars[theme]) {
        heroImg.src = themeAvatars[theme];
    }

    const chatHeaderImg = document.getElementById('chatbot-header-img');
    const chatBtnImg = document.getElementById('chatbot-btn-img');
    if (chatHeaderImg && themeAvatars[theme]) chatHeaderImg.src = themeAvatars[theme];
    if (chatBtnImg && themeAvatars[theme]) chatBtnImg.src = themeAvatars[theme];

    initOrUpdateRadarChart();
}

function getActiveColors() {
    const style = getComputedStyle(document.documentElement);
    const primaryRgb = style.getPropertyValue('--primary-rgb').trim() || '16, 185, 129';
    const accentRgb = style.getPropertyValue('--accent-rgb').trim() || '6, 182, 212';
    return { primaryRgb, accentRgb };
}

// ============================================
// SCROLL PROGRESS BAR
// ============================================
function updateScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (height > 0 && progressBar) {
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = `${scrolled}%`;
    }
}

// ============================================
// ASTEROID SHOWER CANVAS ANIMATION
// ============================================
function initAsteroidsCanvas() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null, radius: 140 };
    let width = 0;
    let height = 0;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function getRandomRespawn() {
        if (Math.random() < 0.65) {
            return {
                x: Math.random() * width * 1.15 - width * 0.15,
                y: -15 - Math.random() * 40
            };
        } else {
            return {
                x: -15 - Math.random() * 40,
                y: Math.random() * height * 0.85
            };
        }
    }

    class Asteroid {
        constructor() {
            this.reset(true);
        }

        reset(isInitial = false) {
            if (isInitial) {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
            } else {
                const spawn = getRandomRespawn();
                this.x = spawn.x;
                this.y = spawn.y;
            }
            this.size = Math.random() * 2.0 + 0.8;
            this.vx = (0.35 + Math.random() * 0.4);
            this.vy = (0.28 + Math.random() * 0.35);
            this.tailLength = Math.random() * 45 + 32;
            this.baseAlpha = Math.random() * 0.32 + 0.25;
            this.alpha = this.baseAlpha;
            this.angle = Math.atan2(this.vy, this.vx);
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    this.x -= (dx / distance) * force * 1.5;
                    this.y -= (dy / distance) * force * 1.5;
                    this.alpha = Math.min(0.7, this.baseAlpha + 0.3);
                }
            }

            if (this.x > width + 50 || this.y > height + 50) {
                this.reset(false);
            }
        }

        draw(colors) {
            ctx.save();
            const tailX = this.x - Math.cos(this.angle) * this.tailLength;
            const tailY = this.y - Math.sin(this.angle) * this.tailLength;

            const gradient = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
            gradient.addColorStop(0, `rgba(${colors.accentRgb}, 0)`);
            gradient.addColorStop(0.35, `rgba(${colors.accentRgb}, ${this.alpha * 0.12})`);
            gradient.addColorStop(0.75, `rgba(${colors.primaryRgb}, ${this.alpha * 0.45})`);
            gradient.addColorStop(1, `rgba(${colors.primaryRgb}, ${this.alpha})`);

            ctx.shadowColor = `rgba(${colors.primaryRgb}, 0.5)`;
            ctx.shadowBlur = 5;

            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.size * 0.9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();

            ctx.fillStyle = `rgba(${colors.primaryRgb}, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.9, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    function initAsteroids() {
        particles = [];
        const count = Math.floor(Math.min(width, 1600) / 32);
        for (let i = 0; i < count; i++) {
            particles.push(new Asteroid());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        const colors = getActiveColors();
        particles.forEach(p => {
            p.update();
            p.draw(colors);
        });
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        initAsteroids();
    });

    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    resizeCanvas();
    initAsteroids();
    animate();
}

// ============================================
// KPI PRESETS & RADAR CHART
// ============================================
const KPI_PRESETS = {
    overview: {
        labels: {
            es: ['Backend (.NET/Node)', 'SQL & Arquitectura Datos', 'Cloud & DevOps (Azure)', 'Big Data & Analítica', 'Frontend & Mobile', 'Project Management'],
            en: ['Backend (.NET/Node)', 'SQL & Data Architecture', 'Cloud & DevOps (Azure)', 'Big Data & Analytics', 'Frontend & Mobile', 'Project Management']
        },
        data: [95, 92, 85, 90, 84, 88],
        title: {
            es: 'Distribución de Dominio Técnico',
            en: 'Technical Domain Distribution'
        },
        badge: {
            es: 'Live Radar Analytics',
            en: 'Live Radar Analytics'
        }
    },
    queries: {
        labels: {
            es: ['SQL Server & SPs', 'Query Optimization', 'Index Tuning & Execution Plans', 'Power BI / DAX', 'ETL & Data Pipeline', 'Modelado Relacional'],
            en: ['SQL Server & SPs', 'Query Optimization', 'Index Tuning & Execution Plans', 'Power BI / DAX', 'ETL & Data Pipeline', 'Relational Modeling']
        },
        data: [98, 96, 94, 90, 89, 95],
        title: {
            es: 'Especialización: SQL & Optimización de Datos (+50 SPs)',
            en: 'Specialization: SQL & Data Optimization (+50 SPs)'
        },
        badge: {
            es: 'Database Engineering Focus',
            en: 'Database Engineering Focus'
        }
    },
    transaccionalidad: {
        labels: {
            es: ['.NET Core / C#', 'Transaccionalidad ACID', 'Arquitectura REST APIs', 'Azure Logic Apps & Cloud', 'Seguridad & Autenticación', 'Clean Architecture'],
            en: ['.NET Core / C#', 'ACID Compliance', 'REST API Architecture', 'Azure Logic Apps & Cloud', 'Security & Authentication', 'Clean Architecture']
        },
        data: [96, 99, 95, 88, 92, 94],
        title: {
            es: 'Especialización: Backend & Alta Transaccionalidad (100% Integridad)',
            en: 'Specialization: High Transactional Backend (100% Integrity)'
        },
        badge: {
            es: 'Mission Critical Backend Focus',
            en: 'Mission Critical Backend Focus'
        }
    },
    soluciones: {
        labels: {
            es: ['Ventanilla MICM (.NET)', 'IAventary (AI/NestJS)', 'Vigilante CJB (Real-Time)', 'TalentFit AI (NLP/ML)', 'Fitplans (Angular/UX)', 'ReciclaDO (Mobile App)'],
            en: ['Ventanilla MICM (.NET)', 'IAventary (AI/NestJS)', 'Vigilante CJB (Real-Time)', 'TalentFit AI (NLP/ML)', 'Fitplans (Angular/UX)', 'ReciclaDO (Mobile App)']
        },
        data: [96, 92, 90, 94, 88, 89],
        title: {
            es: 'Impacto en Producción: Proyectos & Soluciones (+6)',
            en: 'Production Impact: Projects & Solutions (+6)'
        },
        badge: {
            es: 'Full Stack Solutions Focus',
            en: 'Full Stack Solutions Focus'
        }
    },
    maestrias: {
        labels: {
            es: ['Big Data & Analítica', 'Business Intelligence', 'Project Management (Scrum/Agile)', 'Arquitectura Estratégica', 'Toma de Decisiones con Datos', 'Liderazgo Técnico'],
            en: ['Big Data & Analytics', 'Business Intelligence', 'Project Management (Scrum/Agile)', 'Strategic Architecture', 'Data-Driven Decision Making', 'Technical Leadership']
        },
        data: [95, 94, 92, 90, 96, 88],
        title: {
            es: 'Postgrado: Big Data, BI & Project Management (2 Maestrías)',
            en: 'Postgraduate: Big Data, BI & Project Management (2 Master\'s)'
        },
        badge: {
            es: 'Master\'s & Leadership Focus',
            en: 'Master\'s & Leadership Focus'
        }
    }
};

function initOrUpdateRadarChart() {
    const chartCanvas = document.getElementById('techRadarChart');
    if (!chartCanvas || typeof Chart === 'undefined') return;

    const colors = getActiveColors();
    const primaryColor = `rgb(${colors.primaryRgb})`;
    const primaryBg = `rgba(${colors.primaryRgb}, 0.25)`;
    const accentColor = `rgb(${colors.accentRgb})`;

    const currentPreset = KPI_PRESETS[activeKpiKey || 'overview'];
    const labels = currentPreset.labels[currentLang] || currentPreset.labels.es;
    const dataValues = currentPreset.data;

    const chartTitleEl = document.getElementById('chart-header-title');
    const chartBadgeEl = document.getElementById('chart-badge-text');
    if (chartTitleEl) chartTitleEl.textContent = currentPreset.title[currentLang] || currentPreset.title.es;
    if (chartBadgeEl) chartBadgeEl.textContent = currentPreset.badge[currentLang] || currentPreset.badge.es;

    if (radarChartInstance) {
        radarChartInstance.data.labels = labels;
        radarChartInstance.data.datasets[0].data = dataValues;
        radarChartInstance.data.datasets[0].borderColor = primaryColor;
        radarChartInstance.data.datasets[0].backgroundColor = primaryBg;
        radarChartInstance.data.datasets[0].pointBackgroundColor = primaryColor;
        radarChartInstance.data.datasets[0].pointHoverBorderColor = accentColor;
        radarChartInstance.update('active');
        return;
    }

    radarChartInstance = new Chart(chartCanvas, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: currentLang === 'en' ? 'Proficiency Level (%)' : 'Nivel de Dominio (%)',
                data: dataValues,
                fill: true,
                backgroundColor: primaryBg,
                borderColor: primaryColor,
                pointBackgroundColor: primaryColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: accentColor,
                borderWidth: 2.2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 650,
                easing: 'easeOutQuart'
            },
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.12)' },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' },
                    pointLabels: {
                        color: 'rgba(255, 255, 255, 0.88)',
                        font: { size: 11, family: 'Inter, sans-serif', weight: '600' }
                    },
                    ticks: {
                        display: false,
                        stepSize: 20
                    },
                    suggestedMin: 50,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 15, 20, 0.95)',
                    titleColor: primaryColor,
                    bodyColor: '#fff',
                    borderColor: primaryColor,
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => ` ${ctx.formattedValue}%`
                    }
                }
            }
        }
    });
}

function setupKpiInteractivity() {
    const kpiCards = document.querySelectorAll('.interactive-kpi');
    kpiCards.forEach(card => {
        card.addEventListener('click', () => {
            const metricKey = card.getAttribute('data-metric');
            if (activeKpiKey === metricKey) {
                // Toggle off back to overview
                activeKpiKey = null;
                kpiCards.forEach(c => c.classList.remove('active-kpi'));
            } else {
                // Focus on selected KPI
                activeKpiKey = metricKey;
                kpiCards.forEach(c => c.classList.remove('active-kpi'));
                card.classList.add('active-kpi');
            }
            playSound('click');
            initOrUpdateRadarChart();
        });
    });
}

// ============================================
// PROJECTS MANAGEMENT & GITHUB SYNC
// ============================================
const GITHUB_USERNAME = 'devmfranco';
let allProjects = [];

const projectIcons = {
    'Ventanilla Virtual MICM': '🏛️',
    'IAventary': '🤖',
    'Vigilante CJB': '🚨',
    'TalentFit AI': '🧠',
    'Fitplans': '🏋️',
    'ReciclaDO': '♻️'
};

async function loadProjects() {
    const projectGrid = document.getElementById('project-grid');
    try {
        const res = await fetch('repos.json');
        if (!res.ok) throw new Error('Could not load local repos.json');
        allProjects = await res.json();
        renderProjects(allProjects);
    } catch (err) {
        console.warn('Fallback failed:', err);
        if (projectGrid) {
            projectGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Error al cargar los proyectos.</p>';
        }
    }

    try {
        const apiRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=15`);
        if (apiRes.ok) {
            const githubRepos = await apiRes.json();
            allProjects.forEach(p => {
                const match = githubRepos.find(r => r.name.toLowerCase() === p.name.toLowerCase().replace(/\s+/g, '-'));
                if (match) {
                    p.stargazers_count = match.stargazers_count;
                    p.forks_count = match.forks_count;
                    p.html_url = match.html_url;
                }
            });
            renderProjects(allProjects);
        }
    } catch (e) {
        // Silent catch for API limits
    }
}

function renderProjects(projects) {
    const projectGrid = document.getElementById('project-grid');
    if (!projectGrid) return;
    projectGrid.innerHTML = '';

    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.setAttribute('data-category', p.category || 'all');

        const icon = projectIcons[p.name] || '💻';
        const isOfficialProduction = p.name.includes('MICM') || p.name.includes('Ventanilla');
        const demoLinkText = isOfficialProduction
            ? (currentLang === 'en' ? 'Official Production' : 'Portal Oficial')
            : (currentLang === 'en' ? 'Live Demo' : 'Ver Demo');

        const title = currentLang === 'en' ? (p.name_en || p.name) : p.name;
        const description = currentLang === 'en' ? (p.description_en || p.description) : p.description;

        const liveBtn = p.homepage
            ? `<a href="${p.homepage}" target="_blank" rel="noopener noreferrer" class="btn-primary-small">
                 <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                 ${demoLinkText}
               </a>`
            : '';

        const codeBtn = p.html_url
            ? `<a href="${p.html_url}" target="_blank" rel="noopener noreferrer" class="btn-secondary-small">
                 <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                 ${t('projects.btn.code')}
               </a>`
            : '';

        const techBadges = (p.topics || [])
            .map(t => `<span class="tag">${escapeHtml(t)}</span>`)
            .join('');

        card.innerHTML = `
            <div class="project-card-header">
                <span class="project-icon">${icon}</span>
                <div class="project-links">
                    ${liveBtn}
                    ${codeBtn}
                </div>
            </div>
            <h3 class="project-title">${escapeHtml(title)}</h3>
            <p class="project-desc">${escapeHtml(description)}</p>
            <div class="project-tech-tags">
                ${techBadges}
            </div>
        `;

        projectGrid.appendChild(card);
    });
}

function initProjectFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');

            playSound('click');

            if (filter === 'all') {
                renderProjects(allProjects);
            } else {
                const filtered = allProjects.filter(p => p.category === filter);
                renderProjects(filtered);
            }
        });
    });
}

// ============================================
// FRANCOBOT AI CHATBOT SYSTEM & IN-CHAT EMAIL
// ============================================
let chatInitialized = false;

function toggleChat(forceOpen = null) {
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotInput = document.getElementById('chatbot-input');
    if (!chatbotWindow) return;
    const shouldOpen = forceOpen !== null ? forceOpen : !chatbotWindow.classList.contains('active');
    if (shouldOpen) {
        chatbotWindow.classList.add('active');
        if (!chatInitialized) {
            initChatbot();
        }
        chatbotInput?.focus();
        playSound('msg');
    } else {
        chatbotWindow.classList.remove('active');
        playSound('click');
    }
}

function renderChatbotQuickChips() {
    const chatbotQuickChips = document.getElementById('chatbot-quick-chips');
    if (!chatbotQuickChips) return;
    chatbotQuickChips.innerHTML = '';
    const chips = (translations[currentLang] || translations.es)["chat.chips"] || [];
    chips.forEach(chipText => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quick-chip-btn';
        btn.textContent = chipText;
        btn.addEventListener('click', () => {
            handleUserMessage(chipText);
        });
        chatbotQuickChips.appendChild(btn);
    });
}

function initChatbot() {
    chatInitialized = true;
    const chatbotMessages = document.getElementById('chatbot-messages');
    if (chatbotMessages) {
        chatbotMessages.innerHTML = '';
    }
    const welcome = t('chat.welcome');
    appendBotMessage(welcome);
    renderChatbotQuickChips();
}

function appendUserMessage(text) {
    const chatbotMessages = document.getElementById('chatbot-messages');
    if (!chatbotMessages) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg-user';
    msg.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
    chatbotMessages.appendChild(msg);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Markdown parser to ensure natural, clean formatting without raw asterisks
function formatBotMessage(text) {
    if (!text) return '';
    let html = text;

    // Convert triple asterisks or double asterisks to strong
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
    
    // Markdown links [text](url) -> <a href="url" target="_blank">text</a>
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bullet points conversion
    html = html.replace(/\n\s*•\s*/g, '<br>• ');
    html = html.replace(/\n\s*-\s*/g, '<br>• ');
    html = html.replace(/\n/g, '<br>');

    return html;
}

function appendBotMessage(htmlOrMarkdown, withContactForm = false, contactContext = '') {
    const chatbotMessages = document.getElementById('chatbot-messages');
    if (!chatbotMessages) return;

    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg-bot';
    const parsedHtml = formatBotMessage(htmlOrMarkdown);
    
    msg.innerHTML = `<div class="chat-bubble">${parsedHtml}</div>`;
    
    if (withContactForm) {
        const formCard = document.createElement('div');
        formCard.className = 'chat-contact-card';
        formCard.innerHTML = `
            <div class="chat-contact-card-title">
                <span>📬</span> ${currentLang === 'en' ? 'Send direct message to Michael Franco' : 'Enviar mensaje directo a Michael Franco'}
            </div>
            <form class="chat-contact-form" id="in-chat-contact-form-${Date.now()}">
                <input type="text" class="chat-form-input" name="sender_name" placeholder="${currentLang === 'en' ? 'Your Name / Company' : 'Tu Nombre o Empresa'}" required />
                <input type="email" class="chat-form-input" name="sender_email" placeholder="${currentLang === 'en' ? 'Your Email' : 'Tu Correo Electrónico'}" required />
                <textarea class="chat-form-textarea" name="sender_message" placeholder="${currentLang === 'en' ? 'What project or opportunity do you want to discuss?' : '¿Qué proyecto u oportunidad deseas tratar?'}" required>${escapeHtml(contactContext)}</textarea>
                <button type="submit" class="chat-form-submit-btn">
                    <span>🚀</span> ${currentLang === 'en' ? 'Send to Michael Franco' : 'Enviar al correo de Michael Franco'}
                </button>
            </form>
            <div class="chat-form-feedback"></div>
        `;

        const formEl = formCard.querySelector('form');
        const feedbackEl = formCard.querySelector('.chat-form-feedback');
        const submitBtn = formCard.querySelector('.chat-form-submit-btn');

        formEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = formEl.elements['sender_name'].value.trim();
            const email = formEl.elements['sender_email'].value.trim();
            const message = formEl.elements['sender_message'].value.trim();

            if (!name || !email || !message) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>⏳</span> ${currentLang === 'en' ? 'Sending message...' : 'Enviando mensaje...'}`;

            try {
                const response = await fetch('https://formsubmit.co/ajax/michaelhq142717@gmail.com', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        message: message,
                        _subject: `[Portfolio FrancoBot AI] Nuevo mensaje de ${name}`,
                        _template: 'box'
                    })
                });

                if (response.ok) {
                    formEl.style.display = 'none';
                    feedbackEl.innerHTML = `
                        <div class="chat-form-success">
                            <span>✅</span>
                            <div>
                                <b>${currentLang === 'en' ? 'Message Sent Successfully!' : '¡Notificación enviada con éxito!'}</b><br>
                                ${currentLang === 'en' 
                                    ? `Michael Franco has received your message and will respond to your email shortly.`
                                    : `Michael Franco ha recibido tu mensaje y te responderá a tu correo a la brevedad.`
                                }
                            </div>
                        </div>
                    `;
                    playSound('msg');
                } else {
                    throw new Error('Network error');
                }
            } catch (err) {
                // Fallback to mailto link
                const mailtoUrl = `mailto:michaelhq142717@gmail.com?subject=${encodeURIComponent('Contacto desde Portfolio: ' + name)}&body=${encodeURIComponent(message + '\n\nDe: ' + name + ' (' + email + ')')}`;
                formEl.style.display = 'none';
                feedbackEl.innerHTML = `
                    <div class="chat-form-success" style="border-color:var(--accent);color:#fed7aa;">
                        <span>✉️</span>
                        <div>
                            <b>${currentLang === 'en' ? 'Ready to send directly:' : 'Listo para enviar:'}</b><br>
                            <a href="${mailtoUrl}" target="_blank" class="chat-action-btn" style="display:inline-block;margin-top:6px;">
                                ${currentLang === 'en' ? 'Open in your email client' : 'Abrir en tu cliente de correo'} ↗
                            </a>
                        </div>
                    </div>
                `;
            }

            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        });

        msg.querySelector('.chat-bubble').appendChild(formCard);
    }

    chatbotMessages.appendChild(msg);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    playSound('msg');
}

function showTypingIndicator() {
    const chatbotMessages = document.getElementById('chatbot-messages');
    if (!chatbotMessages) return;
    const ind = document.createElement('div');
    ind.className = 'chat-msg chat-msg-bot typing-container';
    ind.id = 'chat-typing-indicator';
    ind.innerHTML = `<div class="chat-bubble typing-indicator"><span></span><span></span><span></span></div>`;
    chatbotMessages.appendChild(ind);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function removeTypingIndicator() {
    const ind = document.getElementById('chat-typing-indicator');
    if (ind) ind.remove();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
}

// Deep Conversational Knowledge Base Responder
function generateBotReply(query) {
    const q = query.toLowerCase();

    // Trigger in-chat email form explicitly
    if (q.includes('correo') || q.includes('email') || q.includes('contratar') || q.includes('hire') || q.includes('notific') || q.includes('mensaje a michael') || q.includes('contactar') || q.includes('enviar')) {
        const replyText = currentLang === 'en'
            ? `I can notify Michael Franco right now! Please fill out this brief message card and it will be delivered directly to his inbox:`
            : `¡Puedo notificar a Michael Franco de inmediato! Completa este breve formulario y tu mensaje se enviará directamente a su bandeja de entrada:`;
        return { text: replyText, withForm: true };
    }

    // 1. MICM / Ventanilla Virtual / .NET
    if (q.includes('micm') || q.includes('ventanilla') || q.includes('.net') || q.includes('c#') || q.includes('ministerio')) {
        const text = currentLang === 'en'
            ? `Michael served as a **Full Stack Developer** on the official **Ventanilla Virtual platform for the Ministry of Industry, Commerce & MSMEs (MICM)**.

Key contributions include:
• Engineered high-performance backend modules in **.NET / C#** and **Razor Pages**.
• Built responsive frontend interfaces using **Angular**.
• Structured and optimized complex transactional routines with **SQL Server**, ensuring 100% data integrity for official government procedures.

You can inspect the live production portal at [ventanillavirtual.micm.gob.do](https://ventanillavirtual.micm.gob.do/Servicios/Info).`
            : `Michael se desempeñó como **Desarrollador Full Stack** en la **Ventanilla Virtual del Ministerio de Industria, Comercio y Mipymes (MICM)**.

Sus principales aportes fueron:
• Desarrollo de módulos transaccionales y servicios backend robustos con **.NET / C#** y **Razor Pages**.
• Creación de interfaces ágiles y reactivas con **Angular**.
• Optimización de procedimientos almacenados y consultas de alto rendimiento en **SQL Server**, garantizando 100% de consistencia en trámites públicos.

Puedes acceder al portal en producción en [ventanillavirtual.micm.gob.do](https://ventanillavirtual.micm.gob.do/Servicios/Info).`;
        return { text };
    }

    // 2. Banco de Reservas / SQL / Power BI / Power Automate / DAX
    if (q.includes('banco') || q.includes('reservas') || q.includes('power bi') || q.includes('automate') || q.includes('dax') || q.includes('analitica') || q.includes('sql')) {
        const text = currentLang === 'en'
            ? `At **Banco de Reservas**, Michael engineered mission-critical data solutions:
• Developed and fine-tuned complex **SQL Server stored procedures and queries**, optimizing extraction and execution times.
• Built interactive **Power BI executive dashboards** with DAX modeling for business intelligence.
• Automated core data pipelines using **Power Automate** and cloud workflows, significantly boosting operational efficiency.`
            : `En el **Banco de Reservas**, Michael lideró soluciones clave de analítica y datos:
• Diseñó y afinó consultas complejas y **procedimientos almacenados en SQL Server**, optimizando tiempos de respuesta.
• Construyó paneles ejecutivos interactivos en **Power BI** con modelado DAX para la toma de decisiones empresariales.
• Automatizó flujos de trabajo e integraciones con **Power Automate**, reduciendo tiempos operativos.`;
        return { text };
    }

    // 3. Education / Maestrías / Master's / Estudios / Titulación
    if (q.includes('maestr') || q.includes('master') || q.includes('educa') || q.includes('estudio') || q.includes('degree') || q.includes('universidad') || q.includes('postgrado')) {
        const text = currentLang === 'en'
            ? `Michael holds a formal degree in **Software Engineering** complemented by a prestigious **Dual Master's Degree**:

1. 🎓 **Master's Degree in Big Data & Business Intelligence**: Advanced data warehousing, machine learning foundations, ETL pipelines, and predictive analytics.
2. 🎓 **Master's Degree in Project Management**: Agile methodologies (Scrum/Kanban), strategic resource planning, risk assessment, and technical project leadership.

This dual specialty allows him to bridge high-level software engineering with actionable business intelligence.`
            : `Michael es graduado en **Ingeniería de Software** y cuenta con una **Doble Maestría de Postgrado**:

1. 🎓 **Maestría en Big Data & Business Intelligence**: Data warehousing, pipelines ETL, analítica avanzada y modelos predictivos.
2. 🎓 **Maestría en Project Management**: Metodologías ágiles (Scrum, Kanban), gestión estratégica de recursos, riesgos y liderazgo de equipos técnicos.

Esta doble especialización le permite unir la arquitectura de software con el análisis de datos de alto impacto empresarial.`;
        return { text };
    }

    // 4. Azure / Cloud / DevOps / Docker / Tools
    if (q.includes('azure') || q.includes('cloud') || q.includes('devops') || q.includes('logic app') || q.includes('docker') || q.includes('herramientas') || q.includes('visual studio')) {
        const text = currentLang === 'en'
            ? `Michael works extensively across the Microsoft & modern cloud stack:
• **Microsoft Azure & Azure Logic Apps**: Cloud orchestration, event-driven architectures, and automated serverless workflows.
• **Azure DevOps & CI/CD**: Automated build, test, and release pipelines.
• **Database Engines**: MS SQL Server, MySQL, PostgreSQL, Supabase.
• **IDEs & Tooling**: Visual Studio Enterprise, VS Code, Git, Docker containerization.`
            : `Michael domina el ecosistema cloud de Microsoft y herramientas modernas:
• **Microsoft Azure & Azure Logic Apps**: Orquestación en la nube, arquitecturas serverless y flujos automatizados.
• **Azure DevOps & CI/CD**: Pipelines automatizados de integración y despliegue continuo.
• **Bases de Datos**: Microsoft SQL Server, MySQL, PostgreSQL, Supabase.
• **Entornos & Herramientas**: Visual Studio Enterprise, VS Code, Git y contenedores Docker.`;
        return { text };
    }

    // 5. Projects / Proyectos / Showcase
    if (q.includes('proyect') || q.includes('project') || q.includes('iaventary') || q.includes('vigilante') || q.includes('talent') || q.includes('fitplan') || q.includes('recicla')) {
        const text = currentLang === 'en'
            ? `Michael has developed 6 flagship projects across web, cloud, AI, and mobile:

1. 🏛️ **Ventanilla Virtual MICM**: Official transactional platform (.NET, Angular, SQL Server).
2. 🤖 **IAventary**: AI-powered inventory and replenishment system (NestJS, Supabase, TypeORM).
3. 🚨 **Vigilante CJB**: Real-time citizen security & mapping portal (React, Leaflet, Supabase).
4. 🧠 **TalentFit AI**: ML/NLP resume and skill gap analyzer (Python, TF-IDF, React).
5. 🏋️ **Fitplans**: Fitness planning system prototype (Angular, Karma, Figma).
6. ♻️ **ReciclaDO**: Environmental waste collection mobile application (React Native, Expo).

You can test their live interactive demos directly in the [Projects section](#projects)!`
            : `Michael ha desarrollado 6 proyectos destacados que combinan software, nube, IA y mobile:

1. 🏛️ **Ventanilla Virtual MICM**: Plataforma transaccional de producción (.NET, Angular, SQL Server).
2. 🤖 **IAventary**: Gestión de inventario inteligente con IA (NestJS, Supabase, TypeORM).
3. 🚨 **Vigilante CJB**: Sistema de alertas comunitarias y mapeo en tiempo real (React, Leaflet, Supabase).
4. 🧠 **TalentFit AI**: Analizador de currículums y competencias con NLP / Machine Learning.
5. 🏋️ **Fitplans**: Prototipo y desarrollo de entrenamientos personalizados (Angular, Karma, Figma).
6. ♻️ **ReciclaDO**: Aplicación móvil para gestión de reciclaje urbano (React Native, Expo).

¡Puedes probar sus demos directamente en la [sección de Proyectos](#projects)!`;
        return { text };
    }

    // 6. Capacity, Working hours & Availability / Capacidad / Tiempo de trabajo / Disponibilidad
    if (q.includes('capacidad') || q.includes('tiempo') || q.includes('disponib') || q.includes('horario') || q.includes('remoto') || q.includes('modalidad') || q.includes('full time') || q.includes('freelance')) {
        const text = currentLang === 'en'
            ? `Michael offers solid technical capacity and flexible availability:
• **Work Arrangements**: Available for **Full-Time Remote**, **Hybrid**, or high-impact **Technical Consulting / Contracts**.
• **Timezone Flexibility**: Based in Dominican Republic (GMT-4 / EST), providing seamless collaboration with teams across the Americas and Europe.
• **Capacity & Strengths**: End-to-end full stack software engineering, scalable backend design, complex database tuning, and business analytics leadership.

Would you like to send a message or proposal directly to Michael Franco?`
            : `Michael cuenta con alta capacidad técnica y disponibilidad flexible:
• **Modalidades de Trabajo**: Disponible para posiciones **Remotas a Tiempo Completo (Full-Time)**, esquemas **Híbridos**, o contratos de **Consultoría de Software & Datos**.
• **Zona Horaria & Flexibilidad**: Radicado en República Dominicana (GMT-4 / EST), con total sincronía horaria para proyectos en Norteamérica, Latinoamérica y Europa.
• **Capacidad & Enfoque**: Desarrollo integral de software, diseño de arquitecturas escalables, optimización de bases de datos críticas y liderazgo técnico.

¿Deseas dejarle un mensaje o coordinar una reunión enviándole una notificación a su correo?`;
        return { text, withForm: true, contactContext: currentLang === 'en' ? 'Hello Michael, we are interested in discussing an opportunity with you.' : 'Hola Michael, nos gustaría conversar sobre una propuesta u oportunidad laboral.' };
    }

    // 7. Saludo / Greeting
    if (q.includes('hola') || q.includes('hi') || q.includes('hello') || q.includes('buenas') || q.includes('hey') || q.includes('saludos')) {
        const text = currentLang === 'en'
            ? `Hello! 👋 It's a pleasure to assist you. 

I can answer any questions regarding Michael Franco's background:
• His work at **MICM** (.NET, Angular, SQL Server) and **Banco de Reservas** (SQL, Power BI).
• His **Dual Master's Degree** in Big Data & BI and Project Management.
• His interactive **portfolio projects** and live demos.
• Or sending a direct message to Michael Franco.

What would you like to explore?`
            : `¡Hola! 👋 Es un gusto saludarte.

Estoy aquí para responder cualquier pregunta sobre el perfil de Michael Franco:
• Su experiencia en el **MICM** (.NET, Angular, SQL) y **Banco de Reservas** (SQL, Power BI).
• Su **Doble Maestría** en Big Data & BI y Project Management.
• Sus **6 proyectos destacados** y demos en producción.
• O enviar una notificación directa al correo de Michael Franco.

¿Sobre qué te gustaría conocer más?`;
        return { text };
    }

    // Default fallback
    const text = currentLang === 'en'
        ? `Michael Franco is a **Software Engineer & Data Analyst** with a **Dual Master's Degree** in Big Data & Business Intelligence and Project Management.

He specializes in **.NET / C#**, **SQL Server**, **Azure Logic Apps & Cloud**, **Angular / React**, and **Power BI Analytics**.

Feel free to ask about his experience at **MICM**, **Banco de Reservas**, his **projects**, or request to send him a direct message!`
        : `Michael Franco es **Ingeniero en Software & Analista de Datos** con una **Doble Maestría** en Big Data & Business Intelligence y Project Management.

Sus fortalezas principales abarcan **.NET / C#**, **SQL Server**, **Azure Cloud & Logic Apps**, **Angular / React** y analítica con **Power BI**.

Pregúntame sobre su experiencia en el **MICM**, **Banco de Reservas**, sus **proyectos** o déjale un mensaje directo para contactar a Michael Franco.`;
    return { text };
}

function handleUserMessage(text) {
    if (!text || !text.trim()) return;
    appendUserMessage(text);
    const chatbotInput = document.getElementById('chatbot-input');
    if (chatbotInput) chatbotInput.value = '';

    showTypingIndicator();
    setTimeout(() => {
        removeTypingIndicator();
        const response = generateBotReply(text);
        if (typeof response === 'string') {
            appendBotMessage(response);
        } else {
            appendBotMessage(response.text, response.withForm, response.contactContext || '');
        }
    }, 550);
}

function initChatbotEvents() {
    const chatbotToggleBtn = document.getElementById('chatbot-toggle-btn');
    const heroChatBtn = document.getElementById('hero-chat-btn');
    const chatbotMinimizeBtn = document.getElementById('chatbot-minimize-btn');
    const chatbotForm = document.getElementById('chatbot-form');
    const chatbotInput = document.getElementById('chatbot-input');

    if (chatbotToggleBtn) chatbotToggleBtn.addEventListener('click', () => toggleChat());
    if (heroChatBtn) heroChatBtn.addEventListener('click', () => toggleChat(true));
    if (chatbotMinimizeBtn) chatbotMinimizeBtn.addEventListener('click', () => toggleChat(false));

    if (chatbotForm) {
        chatbotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatbotInput?.value;
            handleUserMessage(text);
        });
    }
}

// ============================================
// TERMINAL CLI MODAL SYSTEM
// ============================================
function toggleTerminal(open = null) {
    const terminalModal = document.getElementById('terminal-modal');
    const terminalInput = document.getElementById('terminal-input');
    if (!terminalModal) return;
    const shouldOpen = open !== null ? open : !terminalModal.classList.contains('active');
    if (shouldOpen) {
        terminalModal.classList.add('active');
        terminalInput?.focus();
        playSound('terminal');
    } else {
        terminalModal.classList.remove('active');
        playSound('click');
    }
}

function executeCommand(cmdStr) {
    const raw = cmdStr.trim();
    if (!raw) return;

    const terminalHistory = document.getElementById('terminal-history');
    const terminalInput = document.getElementById('terminal-input');
    const terminalBody = document.getElementById('terminal-body');
    if (!terminalHistory) return;

    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    const cmdRow = document.createElement('div');
    cmdRow.className = 'term-cmd-row';
    cmdRow.innerHTML = `<span class="term-prompt">michael@devmfranco:~$</span> <span class="term-cmd-text">${escapeHtml(raw)}</span>`;
    terminalHistory.appendChild(cmdRow);

    const outBlock = document.createElement('div');
    outBlock.className = 'term-output-block';

    const jokesEs = [
        "¿Por qué los desarrolladores prefieren el modo oscuro? Porque la luz atrae a los bugs.",
        "Un optimista ve el vaso medio lleno. Un pesimista ve el vaso medio vacío. Un ingeniero de software ve que el vaso tiene el doble de capacidad requerida.",
        "Hay 10 tipos de personas en el mundo: los que entienden binario y los que no.",
        "¿Qué le dice una base de datos a otra? ¡No me hagas un DROP inesperado!",
        "SELECT * FROM users WHERE status = 'happy' -- 0 rows returned until code deploys."
    ];

    const jokesEn = [
        "Why do programmers prefer dark mode? Because light attracts bugs.",
        "An optimist sees the glass half full. A pessimist sees it half empty. A software engineer sees the glass as having twice the required capacity.",
        "There are 10 types of people: those who understand binary, and those who don't.",
        "What did the SQL database say to the query? Stop locking my tables!",
        "There's no place like 127.0.0.1"
    ];

    const quotesEs = [
        "\"Hablar es barato. Enséñame el código.\" — Linus Torvalds",
        "\"La simplicidad es el prerrequisito para la confiabilidad.\" — Edsger W. Dijkstra",
        "\"Cualquier tonto puede escribir código que una computadora entienda. Los buenos programadores escriben código que los humanos pueden entender.\" — Martin Fowler",
        "\"Primero resuelve el problema. Luego escribe el código.\" — John Johnson",
        "\"Los datos superan a las opiniones.\" — W. Edwards Deming"
    ];

    const quotesEn = [
        "\"Talk is cheap. Show me the code.\" — Linus Torvalds",
        "\"Simplicity is prerequisite for reliability.\" — Edsger W. Dijkstra",
        "\"Any fool can write code that a computer can understand. Good programmers write code that humans can understand.\" — Martin Fowler",
        "\"First, solve the problem. Then, write the code.\" — John Johnson",
        "\"In God we trust, all others must bring data.\" — W. Edwards Deming"
    ];

    const triviaList = [
        {
            q: currentLang === 'en' ? "¿Which port is standard for Microsoft SQL Server?" : "¿Cuál es el puerto estándar por defecto de Microsoft SQL Server?",
            a: currentLang === 'en' ? "Port 1433" : "Puerto 1433"
        },
        {
            q: currentLang === 'en' ? "¿What does ACID stand for in relational databases?" : "¿Qué significa ACID en bases de datos relacionales?",
            a: currentLang === 'en' ? "Atomicity, Consistency, Isolation, Durability" : "Atomicidad, Consistencia, Aislamiento (Isolation) y Durabilidad"
        },
        {
            q: currentLang === 'en' ? "¿Which Microsoft cloud service specializes in serverless visual workflow automation?" : "¿Qué servicio cloud de Azure se especializa en automatización de flujos y orquestación serverless?",
            a: "Azure Logic Apps"
        },
        {
            q: currentLang === 'en' ? "¿What are Michael Franco's two Master's degrees?" : "¿Cuáles son las dos Maestrías de postgrado de Michael Franco?",
            a: currentLang === 'en' ? "1. Big Data & Business Intelligence, 2. Project Management" : "1. Big Data & Business Intelligence, 2. Project Management"
        }
    ];

    switch (cmd) {
        case 'help':
            outBlock.innerHTML = currentLang === 'en' ? `
<b style="color:var(--primary);">🚀 Available CLI Commands:</b>
  <span class="term-hl">skills</span>         - Technical stack categorized
  <span class="term-hl">projects</span>       - List 6 showcase projects & live demos
  <span class="term-hl">exp</span>            - Work experience summary (MICM, Banreservas)
  <span class="term-hl">edu</span>            - Degrees & Dual Master's credentials
  <span class="term-hl">metrics</span>        - Navigate to interactive BI Dashboard
  <span class="term-hl">whoami</span>         - Developer & Engineer identity
  <span class="term-hl">neofetch</span>       - Terminal system overview & specs
  <span class="term-hl">matrix</span>         - Activate visual ASCII Matrix cipher rain
  <span class="term-hl">joke</span>           - Random developer / data joke
  <span class="term-hl">quote</span>          - Inspiring software & data wisdom quote
  <span class="term-hl">quiz</span>           - Random engineering & BI trivia challenge
  <span class="term-hl">banner</span>         - Display ASCII portfolio banner
  <span class="term-hl">calc &lt;expr&gt;</span>    - Quick terminal math calculator (e.g. calc 1024*4)
  <span class="term-hl">echo &lt;text&gt;</span>    - Echo text to terminal
  <span class="term-hl">time</span>           - Current local & UTC timestamps
  <span class="term-hl">theme &lt;name&gt;</span>   - Switch theme: matrix, sunset, cyberpunk, night, dim
  <span class="term-hl">lang &lt;es|en&gt;</span>    - Switch portfolio language (ES / EN)
  <span class="term-hl">contact</span>        - Contact links and profiles
  <span class="term-hl">sudo hire</span>      - Fast-track recruiter & hiring access
  <span class="term-hl">clear</span>          - Clear terminal history
` : `
<b style="color:var(--primary);">🚀 Comandos CLI Disponibles:</b>
  <span class="term-hl">skills</span>         - Muestra el stack técnico por categorías
  <span class="term-hl">projects</span>       - Lista los 6 proyectos destacados con enlaces a demos
  <span class="term-hl">exp</span>            - Resumen de experiencia laboral (MICM, Banreservas)
  <span class="term-hl">edu</span>            - Titulación y Doble Maestría
  <span class="term-hl">metrics</span>        - Navega al dashboard interactivo de Métricas & BI
  <span class="term-hl">whoami</span>         - Identidad profesional y perfil del ingeniero
  <span class="term-hl">neofetch</span>       - Ficha técnica de especificaciones del portafolio
  <span class="term-hl">matrix</span>         - Lluvia de caracteres ASCII estilo Matrix
  <span class="term-hl">chiste</span> / <span class="term-hl">joke</span>  - Chiste para programadores y analistas de datos
  <span class="term-hl">frase</span> / <span class="term-hl">quote</span>   - Frase célebre de ingeniería de software y datos
  <span class="term-hl">quiz</span> / <span class="term-hl">trivia</span>   - Pregunta técnica interactiva con respuesta
  <span class="term-hl">banner</span>         - Muestra el banner ASCII de Michael Franco
  <span class="term-hl">calc &lt;expr&gt;</span>    - Calculadora matemática en la terminal (ej: calc 1024*4)
  <span class="term-hl">echo &lt;texto&gt;</span>   - Imprime el texto ingresado
  <span class="term-hl">time</span>           - Muestra fecha y hora actual
  <span class="term-hl">theme &lt;name&gt;</span>   - Cambia el tema: matrix, sunset, cyberpunk, night, dim
  <span class="term-hl">lang &lt;es|en&gt;</span>    - Cambia el idioma (Español / English)
  <span class="term-hl">contact</span>        - Enlaces directos de contacto y redes
  <span class="term-hl">sudo hire</span>      - Acceso prioritario para reclutadores & empresas
  <span class="term-hl">clear</span>          - Limpia el historial de la terminal
`;
            break;

        case 'skills':
            outBlock.innerHTML = `
<b>[Backend & Arquitectura]</b>: .NET, C#, TypeScript, NestJS, Node.js, Python, TypeORM, REST APIs
<b>[Datos & BI]</b>: MS SQL Server, MySQL, PostgreSQL, Power BI, Power Automate, Supabase, NLP/ML
<b>[Frontend & Mobile]</b>: Angular, Razor Pages, React, Vite, React Native, Expo, JavaScript ES6+
<b>[Cloud & DevOps]</b>: Microsoft Azure, Azure Logic Apps, Azure DevOps, Visual Studio, Git, Docker
            `;
            break;

        case 'projects':
            outBlock.innerHTML = `
1. 🏛️ <b>Ventanilla Virtual MICM</b> (.NET, Angular, Razor Pages, SQL Server) -> <a href="https://ventanillavirtual.micm.gob.do/Servicios/Info" target="_blank" style="color:var(--primary);">Producción</a>
2. 🤖 <b>IAventary</b> (NestJS, Supabase, TypeORM) -> <a href="https://iaventary-frontend.vercel.app/login" target="_blank" style="color:var(--primary);">Demo</a>
3. 🚨 <b>Vigilante CJB</b> (React, Leaflet, Supabase) -> <a href="https://vigilante-cjb.vercel.app/" target="_blank" style="color:var(--primary);">Demo</a>
4. 🧠 <b>TalentFit AI</b> (NLP / ML / TF-IDF) -> <a href="https://devmfranco.github.io/ai-resume-skill-analyzer/#ai-tools" target="_blank" style="color:var(--primary);">App</a>
5. 🏋️ <b>Fitplans</b> (Angular, Karma) -> <a href="https://www.figma.com/proto/dknAPT3RPBh3IsxGokwfnT/Fitplans-?node-id=22-175" target="_blank" style="color:var(--primary);">Figma</a>
6. ♻️ <b>ReciclaDO</b> (React Native, Expo) -> <a href="https://drive.google.com/file/d/1ZRjmaQgNlO_NCPC0bMXmn2SafGQ8YiAL/view?usp=sharing" target="_blank" style="color:var(--primary);">Video</a>
            `;
            break;

        case 'exp':
            outBlock.innerHTML = `
• <b>Ministerio de Industria, Comercio y Mipymes (MICM)</b>: Full Stack Developer (.NET, Angular, Razor, SQL Server).
• <b>Banco de Reservas</b>: Consultas SQL avanzadas, dashboards en Power BI y automatización con Power Automate.
            `;
            break;

        case 'edu':
            outBlock.innerHTML = `
🎓 <b>Ingeniería en Software</b>
🎓 <b>Maestría en Big Data & Business Intelligence</b>
🎓 <b>Maestría en Project Management</b>
            `;
            break;

        case 'whoami':
            outBlock.innerHTML = `
<b>Michael Franco</b> (@devmfranco)
• <b>Rol</b>: Ingeniero en Software & Analista de Datos
• <b>Especialidad</b>: Backend (.NET/Node), SQL Server Optimization, Big Data & BI Dashboarding
• <b>Ubicación</b>: República Dominicana (GMT-4 / Remoto / Híbrido)
• <b>Disponibilidad</b>: Abierto a proyectos de alto impacto y consultoría técnica
            `;
            break;

        case 'neofetch':
        case 'sysinfo':
            outBlock.innerHTML = `
<pre style="font-family:var(--font-mono);font-size:0.8rem;line-height:1.25;color:var(--primary);margin:0;">
   /\_/\       <b>michael@devmfranco</b>
  ( o.o )      -------------------------
   > ^ <       <b>OS</b>: Portfolio OS v2.5 x86_64
               <b>Host</b>: Michael Franco Engineering Rig
               <b>Kernel</b>: Dual-Master-Degree (Big Data & PM)
               <b>Uptime</b>: 24/7 (Always Available)
               <b>Shell</b>: devmfranco-bash 5.2.26
               <b>Stack</b>: .NET / C#, Angular, SQL Server, Python, NestJS, Power BI
               <b>Memory</b>: 100% Passion / 0% Bloatware
</pre>
            `;
            break;

        case 'matrix':
            const chars = '010101DEVMFRAÑCO!@#$%&*+=-/\\|<>[]{}';
            let matrixHtml = '<div style="font-family:var(--font-mono);color:var(--primary);font-size:0.75rem;line-height:1.15;letter-spacing:2px;">';
            for (let row = 0; row < 7; row++) {
                let line = '';
                for (let col = 0; col < 36; col++) {
                    line += chars[Math.floor(Math.random() * chars.length)];
                }
                matrixHtml += `<div>${line}</div>`;
            }
            matrixHtml += '<div style="margin-top:6px;color:#fff;font-weight:bold;">🟢 [MATRIX SYSTEM INITIATED] Connecting to Michael Franco Portfolio Neural Node...</div></div>';
            outBlock.innerHTML = matrixHtml;
            break;

        case 'joke':
        case 'chiste':
            const jokes = currentLang === 'en' ? jokesEn : jokesEs;
            const chosenJoke = jokes[Math.floor(Math.random() * jokes.length)];
            outBlock.innerHTML = `😄 <i>${chosenJoke}</i>`;
            break;

        case 'quote':
        case 'frase':
            const quotes = currentLang === 'en' ? quotesEn : quotesEs;
            const chosenQuote = quotes[Math.floor(Math.random() * quotes.length)];
            outBlock.innerHTML = `💡 <b>${chosenQuote}</b>`;
            break;

        case 'quiz':
        case 'trivia':
            const item = triviaList[Math.floor(Math.random() * triviaList.length)];
            outBlock.innerHTML = `
🧠 <b>${currentLang === 'en' ? 'TECH TRIVIA CHALLENGE' : 'RETO DE TRIVIA TÉCNICA'}</b>:
<b>${item.q}</b>
<div style="margin-top:6px;color:var(--primary);background:rgba(var(--primary-rgb),0.1);padding:6px 10px;border-radius:6px;">
  👉 <b>${currentLang === 'en' ? 'Answer' : 'Respuesta'}:</b> ${item.a}
</div>
            `;
            break;

        case 'banner':
            outBlock.innerHTML = `
<pre style="font-family:var(--font-mono);font-size:0.65rem;color:var(--primary);line-height:1.15;margin:0;">
 __  __ ___ ____ _   _    _    _____ _     _____ ____     _    _   _  ____ ___  
|  \/  |_ _/ ___| | | |  / \  | ____| |   |  ___|  _ \   / \  | \ | |/ ___/ _ \ 
| |\/| || | |   | |_| | / _ \ |  _| | |   | |_  | |_) | / _ \ |  \| | |  | | | |
| |  | || | |___|  _  |/ ___ \| |___| |___|  _| |  _ < / ___ \| |\  | |__| |_| |
|_|  |_|___\____|_| |_/_/   \_\_____|_____|_|   |_| \_\_/   \_\_| \_|\____\___/ 
</pre>
<p style="margin-top:4px;font-size:0.85rem;color:var(--text-secondary);">Michael Franco · Software Engineer & Data Analyst</p>
            `;
            break;

        case 'calc':
            if (!arg) {
                outBlock.innerHTML = currentLang === 'en' ? `Usage: calc &lt;expression&gt; (e.g., calc 256 * 4 + 100)` : `Uso: calc &lt;expresion&gt; (ej: calc 256 * 4 + 100)`;
            } else {
                try {
                    // Safe basic math evaluator (only numbers and operators)
                    const sanitized = arg.replace(/[^0-9+\-*/(). %^]/g, '');
                    const res = Function(`'use strict'; return (${sanitized})`)();
                    outBlock.innerHTML = `🔢 <b>${escapeHtml(arg)}</b> = <span class="term-hl" style="font-size:1.1rem;font-weight:bold;">${res}</span>`;
                } catch (e) {
                    outBlock.innerHTML = `❌ Error evaluating expression: ${escapeHtml(arg)}`;
                }
            }
            break;

        case 'echo':
            outBlock.innerHTML = escapeHtml(arg || '');
            break;

        case 'time':
        case 'date':
            const now = new Date();
            outBlock.innerHTML = `🕒 <b>${now.toLocaleString()}</b> (Local) · <b>${now.toUTCString()}</b> (UTC)`;
            break;

        case 'cv':
        case 'resume':
            outBlock.innerHTML = `
📄 <b>Currículum Vitae de Michael Franco</b>
<p style="margin:6px 0;">Para solicitar el CV completo en formato PDF, conecta directamente vía LinkedIn o correo:</p>
• LinkedIn: <a href="https://www.linkedin.com/in/michael-franco-rodriguez-34389a236/" target="_blank" style="color:var(--primary);">michael-franco-rodriguez</a>
            `;
            break;

        case 'secret':
        case 'easteregg':
            outBlock.innerHTML = `
🎉 <b>[EASTER EGG ACTIVADO]</b>
¡Has descubierto el secreto de la terminal! 
Consejo Pro: Presiona <kbd style="background:#222;padding:2px 6px;border-radius:4px;border:1px solid #444;">Ctrl + K</kbd> en cualquier momento para abrir/cerrar esta terminal.
            `;
            playSound('theme');
            break;

        case 'metrics':
            outBlock.innerHTML = currentLang === 'en' ? `Navigating to Metrics & BI section...` : `Navegando a sección de Métricas & BI...`;
            document.querySelector('#metrics')?.scrollIntoView({ behavior: 'smooth' });
            toggleTerminal(false);
            break;

        case 'theme':
            const themeArg = arg.toLowerCase();
            if (['matrix', 'sunset', 'cyberpunk', 'night', 'dim'].includes(themeArg)) {
                applyTheme(themeArg);
                outBlock.innerHTML = currentLang === 'en' ? `Visual theme changed to: <span class="term-hl">${themeArg}</span>` : `Tema visual cambiado a: <span class="term-hl">${themeArg}</span>`;
            } else {
                outBlock.innerHTML = `Uso: theme &lt;matrix | sunset | cyberpunk | night | dim&gt;`;
            }
            break;

        case 'lang':
            const langArg = arg.toLowerCase();
            if (['es', 'en'].includes(langArg)) {
                setLanguage(langArg);
                outBlock.innerHTML = currentLang === 'en' ? `Language switched to: <span class="term-hl">${langArg.toUpperCase()}</span>` : `Idioma cambiado a: <span class="term-hl">${langArg.toUpperCase()}</span>`;
            } else {
                outBlock.innerHTML = `Uso: lang &lt;es | en&gt;`;
            }
            break;

        case 'contact':
            outBlock.innerHTML = `
• LinkedIn: <a href="https://www.linkedin.com/in/michael-franco-rodriguez-34389a236/" target="_blank" style="color:var(--primary);">michael-franco-rodriguez</a>
• GitHub: <a href="https://github.com/devmfranco" target="_blank" style="color:var(--primary);">@devmfranco</a>
            `;
            break;

        case 'sudo':
            if (arg === 'hire') {
                outBlock.innerHTML = `
🎉 <b>[ACCESO CONCEDIDO]</b>
¡Gracias por tu interés en contratar a Michael!
Conecta directamente en <a href="https://www.linkedin.com/in/michael-franco-rodriguez-34389a236/" target="_blank" style="color:var(--primary);font-weight:bold;">LinkedIn</a> para coordinar una reunión técnica o propuesta.
                `;
            } else {
                outBlock.innerHTML = `michael is not in the sudoers file. This incident will be reported.`;
            }
            break;

        case 'clear':
            terminalHistory.innerHTML = '';
            if (terminalInput) terminalInput.value = '';
            return;

        default:
            outBlock.innerHTML = currentLang === 'en'
                ? `Command not found: <i>${escapeHtml(cmd)}</i>. Type <span class="term-hl">'help'</span> for available commands.`
                : `Comando no reconocido: <i>${escapeHtml(cmd)}</i>. Escribe <span class="term-hl">'help'</span> para ver la lista.`;
    }

    terminalHistory.appendChild(outBlock);
    if (terminalInput) terminalInput.value = '';
    if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
    playSound('terminal');
}

function initTerminalEvents() {
    const terminalBtn = document.getElementById('terminal-btn');
    const terminalCloseBtn = document.getElementById('terminal-close-btn');
    const terminalCloseDot = document.getElementById('terminal-close-dot');
    const terminalBackdrop = document.getElementById('terminal-backdrop');
    const terminalInput = document.getElementById('terminal-input');
    const chatbotWindow = document.getElementById('chatbot-window');
    const terminalModal = document.getElementById('terminal-modal');

    if (terminalBtn) terminalBtn.addEventListener('click', () => toggleTerminal(true));
    if (terminalCloseBtn) terminalCloseBtn.addEventListener('click', () => toggleTerminal(false));
    if (terminalCloseDot) terminalCloseDot.addEventListener('click', () => toggleTerminal(false));
    if (terminalBackdrop) terminalBackdrop.addEventListener('click', () => toggleTerminal(false));

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggleTerminal();
        }
        if (e.key === 'Escape') {
            if (terminalModal && terminalModal.classList.contains('active')) {
                toggleTerminal(false);
            }
            if (chatbotWindow && chatbotWindow.classList.contains('active')) {
                toggleChat(false);
            }
        }
    });

    if (terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                executeCommand(terminalInput.value);
            }
        });
    }
}

// ============================================
// UI & NAVIGATION HELPERS
// ============================================
function initNavigationEvents() {
    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            localStorage.setItem('portfolio-sound', soundEnabled);
            updateSoundUI();
            if (soundEnabled) playSound('click');
        });
    }

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            const newLang = currentLang === 'es' ? 'en' : 'es';
            setLanguage(newLang);
            playSound('click');
        });
    }

    const themeBtn = document.getElementById('theme-btn');
    const themeMenu = document.getElementById('theme-menu');
    const themeOptions = document.querySelectorAll('.theme-option');

    if (themeBtn && themeMenu) {
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeMenu.classList.toggle('active');
            playSound('click');
        });

        document.addEventListener('click', (e) => {
            if (!themeMenu.contains(e.target) && !themeBtn.contains(e.target)) {
                themeMenu.classList.remove('active');
            }
        });

        themeOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                const theme = opt.dataset.setTheme;
                applyTheme(theme);
                themeMenu.classList.remove('active');
                playSound('theme');
            });
        });
    }

    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
            playSound('click');
        });
    }

    document.addEventListener('click', (e) => {
        if (navMenu && !navMenu.contains(e.target) && menuToggle && !menuToggle.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId) return;
            const target = document.querySelector(targetId);
            if (!target) return;
            e.preventDefault();
            const offset = 80;
            const targetY = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });
            if (navMenu) navMenu.classList.remove('active');
            playSound('click');
        });
    });

    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 120;
            if (window.pageYOffset >= top) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
        updateScrollProgress();
    }, { passive: true });

    const flipContainer = document.getElementById('flip-title-container');
    if (flipContainer) {
        let isFlipped = false;
        setInterval(() => {
            isFlipped = !isFlipped;
            if (isFlipped) {
                flipContainer.classList.add('flipped');
            } else {
                flipContainer.classList.remove('flipped');
            }
        }, 2800);
    }
}

// ============================================
// BOOTSTRAP INITIALIZATION
// ============================================
function initApp() {
    initNavigationEvents();
    initProjectFilters();
    initChatbotEvents();
    initTerminalEvents();
    initAsteroidsCanvas();
    setupKpiInteractivity();
    
    updateSoundUI();
    setLanguage(currentLang);
    applyTheme(activeTheme);
    loadProjects();
    updateScrollProgress();

    setTimeout(() => {
        initOrUpdateRadarChart();
    }, 120);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
