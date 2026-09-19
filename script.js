import { translations } from './i18n.js';

// ============================================
// STATE & PERSISTENCE
// ============================================
let currentLang = localStorage.getItem('portfolio-lang') || 'es';
let soundEnabled = localStorage.getItem('portfolio-sound') !== 'false';
let activeTheme = localStorage.getItem('portfolio-theme') || 'matrix';
let radarChartInstance = null;

// ============================================
// WEB AUDIO API SOUND SYNTHESIZER
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

// Sound toggle button
const soundBtn = document.getElementById('sound-btn');
const soundIconOn = document.getElementById('sound-icon-on');
const soundIconOff = document.getElementById('sound-icon-off');

function updateSoundUI() {
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

if (soundBtn) {
    soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('portfolio-sound', soundEnabled);
        updateSoundUI();
        if (soundEnabled) playSound('click');
    });
}

// ============================================
// LANGUAGE SWITCHER & TRANSLATION ENGINE
// ============================================
const langBtn = document.getElementById('lang-btn');
const langFlag = document.getElementById('lang-flag');
const langText = document.getElementById('lang-text');

function t(key) {
    const dict = translations[currentLang] || translations.es;
    return dict[key] || key;
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('portfolio-lang', lang);
    document.documentElement.setAttribute('lang', lang);

    if (langFlag && langText) {
        langFlag.textContent = lang === 'es' ? '🇩🇴' : '🇺🇸';
        langText.textContent = lang.toUpperCase();
    }

    // Translate all static data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (text) el.innerHTML = text;
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const text = t(key);
        if (text) el.setAttribute('placeholder', text);
    });

    // Re-render chatbot quick chips
    renderChatbotQuickChips();
    // Re-render chart if loaded
    initOrUpdateRadarChart();
}

if (langBtn) {
    langBtn.addEventListener('click', () => {
        const newLang = currentLang === 'es' ? 'en' : 'es';
        setLanguage(newLang);
        playSound('click');
    });
}

// ============================================
// THEME SWITCHER & PERSISTENCE
// ============================================
const themeBtn = document.getElementById('theme-btn');
const themeMenu = document.getElementById('theme-menu');
const themeOptions = document.querySelectorAll('.theme-option');

const themeAvatars = {
    'matrix': 'images/michael-avatar-matrix.jpg',
    'sunset': 'images/michael-avatar-sunset.jpg',
    'cyberpunk': 'images/michael-avatar-cyberpunk.jpg',
    'night': 'images/michael-avatar-night.jpg',
    'dim': 'images/michael-avatar-dim.jpg'
};

function applyTheme(theme) {
    activeTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio-theme', theme);

    themeOptions.forEach(opt => {
        if (opt.dataset.setTheme === theme) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    const heroImg = document.querySelector('.hero-avatar-circle img');
    if (heroImg && themeAvatars[theme]) {
        heroImg.src = themeAvatars[theme];
    }

    const chatHeaderImg = document.getElementById('chatbot-header-img');
    const chatBtnImg = document.getElementById('chatbot-btn-img');
    if (chatHeaderImg && themeAvatars[theme]) chatHeaderImg.src = themeAvatars[theme];
    if (chatBtnImg && themeAvatars[theme]) chatBtnImg.src = themeAvatars[theme];

    // Update Radar Chart colors matching theme
    initOrUpdateRadarChart();
}

applyTheme(activeTheme);

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

function getActiveColors() {
    const style = getComputedStyle(document.documentElement);
    const primaryRgb = style.getPropertyValue('--primary-rgb').trim() || '0, 255, 157';
    const accentRgb = style.getPropertyValue('--accent-rgb').trim() || '0, 245, 212';
    return { primaryRgb, accentRgb };
}

// ============================================
// SCROLL PROGRESS BAR
// ============================================
const progressBar = document.getElementById('scroll-progress');

function updateScrollProgress() {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (height > 0) {
        const scrolled = (winScroll / height) * 100;
        if (progressBar) {
            progressBar.style.width = `${scrolled}%`;
        }
    }
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });

// ============================================
// SLOW & GRACEFUL ASTEROID SHOWER (Inspired by integr-dev)
// ============================================
const canvas = document.getElementById('particles');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null, radius: 140 };
    let width = 0;
    let height = 0;
    let animationFrameId;

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
            this.size = Math.random() * 2.2 + 0.8;
            this.vx = (0.35 + Math.random() * 0.45);
            this.vy = (0.3 + Math.random() * 0.4);
            this.tailLength = Math.random() * 30 + 18;
            this.baseAlpha = Math.random() * 0.5 + 0.3;
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
                    this.x -= (dx / distance) * force * 1.8;
                    this.y -= (dy / distance) * force * 1.8;
                    this.alpha = Math.min(1, this.baseAlpha + 0.4);
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
            gradient.addColorStop(0.7, `rgba(${colors.primaryRgb}, ${this.alpha * 0.4})`);
            gradient.addColorStop(1, `rgba(${colors.primaryRgb}, ${this.alpha})`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.size * 0.85;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();

            ctx.fillStyle = `rgba(${colors.primaryRgb}, ${this.alpha})`;
            ctx.shadowColor = `rgba(${colors.primaryRgb}, 0.8)`;
            ctx.shadowBlur = 8;
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
        animationFrameId = requestAnimationFrame(animate);
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
// 3D FLIP TITLE EFFECT
// ============================================
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

// ============================================
// MOBILE MENU
// ============================================
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

// ============================================
// SMOOTH SCROLLING
// ============================================
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

// ============================================
// ACTIVE NAV ON SCROLL
// ============================================
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
});

// ============================================
// CHART.JS METRICS & BI RADAR DASHBOARD
// ============================================
function initOrUpdateRadarChart() {
    const chartCanvas = document.getElementById('techRadarChart');
    if (!chartCanvas || typeof Chart === 'undefined') return;

    const colors = getActiveColors();
    const primaryColor = `rgb(${colors.primaryRgb})`;
    const primaryBg = `rgba(${colors.primaryRgb}, 0.25)`;
    const accentColor = `rgb(${colors.accentRgb})`;

    const labels = currentLang === 'en'
        ? ['Backend (.NET/Node)', 'SQL & Data Architecture', 'Cloud & DevOps (Azure)', 'Big Data & Analytics', 'Frontend & Mobile', 'Project Management']
        : ['Backend (.NET/Node)', 'SQL & Arquitectura Datos', 'Cloud & DevOps (Azure)', 'Big Data & Analítica', 'Frontend & Mobile', 'Project Management'];

    const dataValues = [95, 92, 85, 90, 84, 88];

    if (radarChartInstance) {
        radarChartInstance.data.labels = labels;
        radarChartInstance.data.datasets[0].borderColor = primaryColor;
        radarChartInstance.data.datasets[0].backgroundColor = primaryBg;
        radarChartInstance.data.datasets[0].pointBackgroundColor = primaryColor;
        radarChartInstance.data.datasets[0].pointHoverBorderColor = accentColor;
        radarChartInstance.update();
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
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.12)' },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' },
                    pointLabels: {
                        color: 'rgba(255, 255, 255, 0.85)',
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

// ============================================
// PROJECTS MANAGEMENT & GITHUB SYNC
// ============================================
const GITHUB_USERNAME = 'devmfranco';
const projectGrid = document.getElementById('project-grid');
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
    try {
        const res = await fetch('repos.json');
        if (!res.ok) throw new Error('Could not load local repos.json');
        allProjects = await res.json();
        renderProjects(allProjects);
    } catch (err) {
        console.warn('Fallback failed:', err);
        if (projectGrid) {
            projectGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Error al cargar los proyectos.</p>';
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
    if (!projectGrid) return;
    projectGrid.innerHTML = '';

    if (projects.length === 0) {
        projectGrid.innerHTML = `<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">${currentLang === 'en' ? 'No projects in this category.' : 'No hay proyectos en esta categoría.'}</p>`;
        return;
    }

    projects.forEach(project => {
        const icon = projectIcons[project.name] || '🚀';
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.category = project.category || 'backend';

        const tagsHtml = (project.topics || []).map(t => `<span>${t}</span>`).join('');
        const codeText = currentLang === 'en' ? 'Code' : 'Código';

        card.innerHTML = `
            <div class="project-header-bar">
                <span class="project-icon-badge">${icon}</span>
                <span class="project-cat-pill">${project.category || 'Software'}</span>
            </div>
            <div class="project-info">
                <h3 class="project-title">${project.name}</h3>
                <p class="project-desc">${project.description || ''}</p>
                ${project.impact ? `
                <div class="project-impact-box">
                    <strong>${currentLang === 'en' ? 'Key Impact:' : 'Impacto Clave:'}</strong>
                    ${project.impact}
                </div>` : ''}
                <div class="project-tags">${tagsHtml}</div>
                <hr class="project-divider">
                <div class="project-actions">
                    ${project.demo_url ? `
                    <a href="${project.demo_url}" target="_blank" rel="noopener" class="project-btn-demo">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        <span>${project.demo_label || (currentLang === 'en' ? 'Live Demo' : 'Ver Demo')}</span>
                    </a>` : ''}
                    ${project.html_url ? `
                    <a href="${project.html_url}" target="_blank" rel="noopener" class="project-btn-code">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                        <span>${codeText}</span>
                    </a>` : ''}
                </div>
            </div>
        `;
        projectGrid.appendChild(card);
    });
}

// Filter clicks
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const filter = this.dataset.filter;
        playSound('click');

        if (filter === 'all') {
            renderProjects(allProjects);
        } else {
            const filtered = allProjects.filter(p => p.category === filter);
            renderProjects(filtered);
        }
    });
});

// ============================================
// FRANCOBOT AI ENGINE
// ============================================
const chatbotContainer = document.getElementById('chatbot-container');
const chatbotToggleBtn = document.getElementById('chatbot-toggle-btn');
const heroChatBtn = document.getElementById('hero-chat-btn');
const chatbotWindow = document.getElementById('chatbot-window');
const chatbotMinimizeBtn = document.getElementById('chatbot-minimize-btn');
const chatbotMessages = document.getElementById('chatbot-messages');
const chatbotQuickChips = document.getElementById('chatbot-quick-chips');
const chatbotForm = document.getElementById('chatbot-form');
const chatbotInput = document.getElementById('chatbot-input');

let chatInitialized = false;

function toggleChat(forceOpen = null) {
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

if (chatbotToggleBtn) chatbotToggleBtn.addEventListener('click', () => toggleChat());
if (heroChatBtn) heroChatBtn.addEventListener('click', () => toggleChat(true));
if (chatbotMinimizeBtn) chatbotMinimizeBtn.addEventListener('click', () => toggleChat(false));

function renderChatbotQuickChips() {
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
    chatbotMessages.innerHTML = '';
    const welcome = t('chat.welcome');
    appendBotMessage(welcome);
    renderChatbotQuickChips();
}

function appendUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg-user';
    msg.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
    chatbotMessages.appendChild(msg);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function appendBotMessage(html) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg-bot';
    msg.innerHTML = `<div class="chat-bubble">${html}</div>`;
    chatbotMessages.appendChild(msg);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    playSound('msg');
}

function showTypingIndicator() {
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
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
}

// Knowledge Base Responder
function generateBotReply(query) {
    const q = query.toLowerCase();

    // 1. MICM / Ventanilla Virtual / .NET
    if (q.includes('micm') || q.includes('ventanilla') || q.includes('.net') || q.includes('c#') || q.includes('ministerio')) {
        return currentLang === 'en'
            ? `Michael worked as a **Full Stack Developer** on the official **Ventanilla Virtual platform for the Ministry of Industry, Commerce & MSMEs (MICM)**. He developed core transactional services and architectural upgrades using **.NET / C#**, **Angular**, **Razor Pages**, and **SQL Server**. You can check the live production portal <a href="https://ventanillavirtual.micm.gob.do/Servicios/Info" target="_blank">here</a>.`
            : `Michael se desempeñó como **Desarrollador Full Stack** en la **Ventanilla Virtual del Ministerio de Industria, Comercio y Mipymes (MICM)**, construyendo módulos transaccionales y optimizaciones de alto rendimiento con **.NET / C#**, **Angular**, **Razor Pages** y **SQL Server**. Puedes ver el portal oficial en producción <a href="https://ventanillavirtual.micm.gob.do/Servicios/Info" target="_blank">aquí</a>.`;
    }

    // 2. Banco de Reservas / SQL / Power BI / Power Automate
    if (q.includes('banco') || q.includes('reservas') || q.includes('power bi') || q.includes('automate') || q.includes('dax')) {
        return currentLang === 'en'
            ? `At **Banco de Reservas**, Michael engineered high-complexity SQL queries, analytical data models, interactive **Power BI dashboards**, and cloud process automation with **Power Automate**, streamlining enterprise data pipelines.`
            : `En el **Banco de Reservas**, Michael diseñó consultas SQL de alta complejidad, modelos analíticos de datos, paneles en **Power BI** y flujos automatizados con **Power Automate**, optimizando procesos críticos de negocio.`;
    }

    // 3. Education / Maestrías / Master's / Estudios
    if (q.includes('maestr') || q.includes('master') || q.includes('educa') || q.includes('estudio') || q.includes('degree') || q.includes('universidad')) {
        return currentLang === 'en'
            ? `Michael holds a degree in **Software Engineering** and completed a **Dual Master's Degree**:
            <br>• 🎓 **Master's in Big Data & Business Intelligence**
            <br>• 🎓 **Master's in Project Management**
            <br>This dual specialization combines deep technical software engineering with rigorous data architecture and agile leadership.`
            : `Michael es graduado en **Ingeniería de Software** y cuenta con una **Doble Maestría de Postgrado**:
            <br>• 🎓 **Maestría en Big Data & Business Intelligence**
            <br>• 🎓 **Maestría en Project Management**
            <br>Esta combinación le permite estructurar arquitecturas de software robustas con analítica avanzada y gestión ágil de proyectos.`;
    }

    // 4. Azure / Cloud / DevOps / Docker
    if (q.includes('azure') || q.includes('cloud') || q.includes('devops') || q.includes('logic app') || q.includes('docker')) {
        return currentLang === 'en'
            ? `Michael has solid expertise across the Microsoft cloud ecosystem: **Microsoft Azure**, **Azure Logic Apps** for automated workflows, **Azure DevOps (CI/CD)** pipelines, Docker containerization, and Visual Studio enterprise tooling.`
            : `Michael cuenta con experiencia en el ecosistema cloud de Microsoft: **Microsoft Azure**, flujos de automatización con **Azure Logic Apps**, integración continua con **Azure DevOps (CI/CD)**, contenedorización con Docker y entornos Visual Studio.`;
    }

    // 5. Projects / Proyectos / IAventary / Vigilante / TalentFit / Fitplans / ReciclaDO
    if (q.includes('proyect') || q.includes('project') || q.includes('iaventary') || q.includes('vigilante') || q.includes('talent') || q.includes('fitplan') || q.includes('recicla')) {
        return currentLang === 'en'
            ? `Michael has developed 6 flagship projects:
            <br>1. 🏛️ **Ventanilla Virtual MICM** (.NET, Angular, Razor Pages)
            <br>2. 🤖 **IAventary** (AI Inventory System - NestJS, Supabase)
            <br>3. 🚨 **Vigilante CJB** (Real-Time Community Alerts - React, Leaflet)
            <br>4. 🧠 **TalentFit AI** (ML/NLP Resume & Skill Gap Analyzer)
            <br>5. 🏋️ **Fitplans** (Fitness Platform Prototype)
            <br>6. ♻️ **ReciclaDO** (Environmental Mobile App - React Native)
            <br>Explore them directly in the <a href="#projects">Projects section</a>!`
            : `Michael cuenta con 6 proyectos destacados:
            <br>1. 🏛️ **Ventanilla Virtual MICM** (.NET, Angular, Razor Pages)
            <br>2. 🤖 **IAventary** (Inventario Inteligente con IA - NestJS, Supabase)
            <br>3. 🚨 **Vigilante CJB** (Alertas Comunitarias en Tiempo Real - React, Leaflet)
            <br>4. 🧠 **TalentFit AI** (Analizador de Habilidades y CVs con Machine Learning/NLP)
            <br>5. 🏋️ **Fitplans** (Plataforma Fitness)
            <br>6. ♻️ **ReciclaDO** (App Móvil de Reciclaje con React Native)
            <br>¡Puedes probar sus demos en la <a href="#projects">sección de Proyectos</a>!`;
    }

    // 6. Contact / Contratar / Hire / LinkedIn / Email
    if (q.includes('contact') || q.includes('hire') || q.includes('contrat') || q.includes('linkedin') || q.includes('email') || q.includes('correo') || q.includes('trabaj')) {
        return currentLang === 'en'
            ? `You can connect with Michael directly via:
            <br>• 💼 <a href="https://www.linkedin.com/in/michael-franco-rodriguez-34389a236/" target="_blank">LinkedIn Profile</a>
            <br>• 💻 <a href="https://github.com/devmfranco" target="_blank">GitHub (@devmfranco)</a>
            <br>He is available for full-time remote opportunities, enterprise consulting, and high-impact engineering contracts!`
            : `Puedes contactar a Michael directamente a través de:
            <br>• 💼 <a href="https://www.linkedin.com/in/michael-franco-rodriguez-34389a236/" target="_blank">Perfil de LinkedIn</a>
            <br>• 💻 <a href="https://github.com/devmfranco" target="_blank">GitHub (@devmfranco)</a>
            <br>Está disponible para oportunidades remotas/híbridas, consultoría técnica y proyectos de desarrollo de alto impacto.`;
    }

    // 7. Saludo / Greeting
    if (q.includes('hola') || q.includes('hi') || q.includes('hello') || q.includes('buenas') || q.includes('hey')) {
        return currentLang === 'en'
            ? `Hello! 👋 How can I help you today? Feel free to ask about Michael's experience in .NET, SQL, BI, or click any of the prompt chips below!`
            : `¡Hola! 👋 ¿Cómo puedo ayudarte hoy? Pregúntame sobre la experiencia de Michael en .NET, SQL, Big Data, proyectos o haz click en los botones sugeridos.`;
    }

    // Default fallback
    return currentLang === 'en'
        ? `Michael is a **Software Engineer & Data Analyst** with dual master's degrees in Big Data & Project Management. Key areas include **.NET / C#**, **SQL Server**, **Azure**, **Angular**, and **Power BI**. You can ask about his roles at **MICM**, **Banco de Reservas**, or his **projects**!`
        : `Michael es **Ingeniero en Software & Analista de Datos** con doble maestría en Big Data & Project Management. Domina **.NET / C#**, **SQL Server**, **Azure**, **Angular** y **Power BI**. ¿Te gustaría saber sobre su experiencia en el **MICM**, **Banco de Reservas** o ver sus **proyectos**?`;
}

function handleUserMessage(text) {
    if (!text || !text.trim()) return;
    appendUserMessage(text);
    if (chatbotInput) chatbotInput.value = '';

    showTypingIndicator();
    setTimeout(() => {
        removeTypingIndicator();
        const reply = generateBotReply(text);
        appendBotMessage(reply);
    }, 600);
}

if (chatbotForm) {
    chatbotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatbotInput?.value;
        handleUserMessage(text);
    });
}

// ============================================
// TERMINAL CLI MODAL SYSTEM
// ============================================
const terminalModal = document.getElementById('terminal-modal');
const terminalBtn = document.getElementById('terminal-btn');
const terminalCloseBtn = document.getElementById('terminal-close-btn');
const terminalCloseDot = document.getElementById('terminal-close-dot');
const terminalBackdrop = document.getElementById('terminal-backdrop');
const terminalInput = document.getElementById('terminal-input');
const terminalHistory = document.getElementById('terminal-history');
const terminalBody = document.getElementById('terminal-body');

function toggleTerminal(open = null) {
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

if (terminalBtn) terminalBtn.addEventListener('click', () => toggleTerminal(true));
if (terminalCloseBtn) terminalCloseBtn.addEventListener('click', () => toggleTerminal(false));
if (terminalCloseDot) terminalCloseDot.addEventListener('click', () => toggleTerminal(false));
if (terminalBackdrop) terminalBackdrop.addEventListener('click', () => toggleTerminal(false));

// Keyboard Shortcuts: Ctrl+K / Cmd+K to toggle Terminal, Esc to close
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

function executeCommand(cmdStr) {
    const raw = cmdStr.trim();
    if (!raw) return;

    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').toLowerCase();

    const cmdRow = document.createElement('div');
    cmdRow.className = 'term-cmd-row';
    cmdRow.innerHTML = `<span class="term-prompt">michael@devmfranco:~$</span> <span class="term-cmd-text">${escapeHtml(raw)}</span>`;
    terminalHistory.appendChild(cmdRow);

    const outBlock = document.createElement('div');
    outBlock.className = 'term-output-block';

    switch (cmd) {
        case 'help':
            outBlock.innerHTML = `
Comandos disponibles:
  <span class="term-hl">skills</span>      - Muestra el stack técnico por categorías
  <span class="term-hl">projects</span>    - Lista los 6 proyectos destacados
  <span class="term-hl">exp</span>         - Resumen de experiencia laboral (MICM, Banreservas)
  <span class="term-hl">edu</span>         - Titulación y Doble Maestría
  <span class="term-hl">metrics</span>     - Abre métricas y KPIs de Big Data & BI
  <span class="term-hl">theme &lt;name&gt;</span> - Cambia el tema: matrix, sunset, cyberpunk, night, dim
  <span class="term-hl">lang &lt;es|en&gt;</span>  - Cambia el idioma (Español / English)
  <span class="term-hl">contact</span>     - Enlaces directos de contacto y redes
  <span class="term-hl">sudo hire</span>   - Acceso prioritario para reclutadores & empresas
  <span class="term-hl">clear</span>       - Limpia el historial de la terminal
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

        case 'metrics':
            outBlock.innerHTML = `Navegando a sección de Métricas & BI...`;
            document.querySelector('#metrics')?.scrollIntoView({ behavior: 'smooth' });
            toggleTerminal(false);
            break;

        case 'theme':
            if (['matrix', 'sunset', 'cyberpunk', 'night', 'dim'].includes(arg)) {
                applyTheme(arg);
                outBlock.innerHTML = `Tema visual cambiado a: <span class="term-hl">${arg}</span>`;
            } else {
                outBlock.innerHTML = `Uso: theme &lt;matrix | sunset | cyberpunk | night | dim&gt;`;
            }
            break;

        case 'lang':
            if (['es', 'en'].includes(arg)) {
                setLanguage(arg);
                outBlock.innerHTML = `Idioma cambiado a: <span class="term-hl">${arg.toUpperCase()}</span>`;
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
            outBlock.innerHTML = `Comando no reconocido: <i>${escapeHtml(cmd)}</i>. Escribe <span class="term-hl">'help'</span> para ver la lista.`;
    }

    terminalHistory.appendChild(outBlock);
    if (terminalInput) terminalInput.value = '';
    if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
    playSound('terminal');
}

if (terminalInput) {
    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            executeCommand(terminalInput.value);
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    updateSoundUI();
    setLanguage(currentLang);
    loadProjects();
    updateScrollProgress();
    setTimeout(() => {
        initOrUpdateRadarChart();
    }, 200);
});
