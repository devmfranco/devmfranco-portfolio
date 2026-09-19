// ============================================
// PARTICLE SYSTEM (Tech Green Glow)
// ============================================
const canvas = document.getElementById('particles');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null, radius: 140 };

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.8;
            this.density = Math.random() * 25 + 1;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
        }
        draw() {
            ctx.fillStyle = `rgba(0, 255, 157, ${this.size / 2.5})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        update() {
            if (mouse.x && mouse.y) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius) {
                    let force = (mouse.radius - dist) / mouse.radius;
                    let angle = Math.atan2(dy, dx);
                    this.x -= Math.cos(angle) * force * this.density * 0.4;
                    this.y -= Math.sin(angle) * force * this.density * 0.4;
                }
            }
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }
    }

    function initParticles() {
        particles = [];
        let count = Math.min((canvas.width * canvas.height) / 11000, 90);
        for (let i = 0; i < count; i++) particles.push(new Particle());
    }

    function connectParticles() {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                let dx = particles[a].x - particles[b].x;
                let dy = particles[a].y - particles[b].y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 110) {
                    ctx.strokeStyle = `rgba(0, 255, 157, ${0.12 - dist / 1000})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        connectParticles();
        requestAnimationFrame(animateParticles);
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
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
    initParticles();
    animateParticles();
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
        if (targetId === '#') return;
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
// PROJECTS MANAGEMENT & GITHUB SYNC
// ============================================
const GITHUB_USERNAME = 'devmfranco';
const projectGrid = document.getElementById('project-grid');
let allProjects = [];

const projectIcons = {
    'IAventary': '🤖',
    'Vigilante CJB': '🚨',
    'TalentFit AI': '🧠',
    'Nish-Soft Extend': '📦',
    'ReciclaDO': '♻️',
    'Fitplans': '🏋️'
};

async function loadProjects() {
    try {
        const res = await fetch('repos.json');
        if (!res.ok) throw new Error('Could not load local repos.json');
        allProjects = await res.json();
        renderProjects(allProjects);
    } catch (err) {
        console.warn('Fallback failed:', err);
        projectGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Error al cargar los proyectos.</p>';
    }

    // Try fetching live GitHub repos in background to enhance data
    try {
        const apiRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=15`);
        if (apiRes.ok) {
            const githubRepos = await apiRes.json();
            // Merge stars or updates into matching repos
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
        // Silent catch for API limits or offline
    }
}

function renderProjects(projects) {
    if (!projectGrid) return;
    projectGrid.innerHTML = '';

    if (projects.length === 0) {
        projectGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">No hay proyectos en esta categoría.</p>';
        return;
    }

    projects.forEach(project => {
        const icon = projectIcons[project.name] || '🚀';
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.category = project.category || 'backend';

        const tagsHtml = (project.topics || []).map(t => `<span>${t}</span>`).join('');

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
                    <strong>Impacto Clave:</strong>
                    ${project.impact}
                </div>` : ''}
                <div class="project-tags">${tagsHtml}</div>
                <hr class="project-divider">
                <div class="project-actions">
                    <a href="${project.html_url}" target="_blank" rel="noopener" class="project-link">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                        <span>Código / Demo</span>
                    </a>
                </div>
            </div>
        `;
        projectGrid.appendChild(card);
    });
}

// ============================================
// FILTER EVENT LISTENERS
// ============================================
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const filter = this.dataset.filter;

        if (filter === 'all') {
            renderProjects(allProjects);
        } else {
            const filtered = allProjects.filter(p => p.category === filter);
            renderProjects(filtered);
        }
    });
});

document.addEventListener('DOMContentLoaded', loadProjects);
