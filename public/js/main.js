document.addEventListener('DOMContentLoaded', () => {
    // --- LOADER ---
    const loader = document.getElementById('loader');
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (loader) loader.classList.add('hidden');
        }, 700); // Slightly longer for more complex loader
    });

    // --- THEME TOGGLER (Same as before) ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    function applyTheme(theme) {
        htmlElement.setAttribute('data-bs-theme', theme);
    }
    let savedTheme = localStorage.getItem('mcicts-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(savedTheme);
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const newTheme = htmlElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('mcicts-theme', newTheme);
        });
    }

    // --- SMOOTH SCROLL FOR NAV LINKS & ACTIVE STATE (Same as before) ---
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const navbarHeight = document.querySelector('.navbar').offsetHeight;
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#') && document.querySelector(href)) {
                e.preventDefault();
                const targetElement = document.querySelector(href);
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                const navbarCollapse = document.querySelector('.navbar-collapse.show');
                if (navbarCollapse) new bootstrap.Collapse(navbarCollapse).hide();
            }
        });
    });
    function updateActiveNavLink() {
        let fromTop = window.scrollY + navbarHeight + 50;
        navLinks.forEach(link => {
            let section = document.querySelector(link.hash);
            if (section && section.offsetTop <= fromTop && section.offsetTop + section.offsetHeight > fromTop) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        if (window.scrollY < document.querySelector('#hero').offsetHeight / 2) {
            navLinks.forEach(l => l.classList.remove('active'));
            const homeLink = document.querySelector('.navbar-nav .nav-link[href="#hero"]');
            if (homeLink) homeLink.classList.add('active');
        }
    }
    window.addEventListener('scroll', updateActiveNavLink);
    updateActiveNavLink();

    // --- DYNAMIC YEAR IN FOOTER (Same as before) ---
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

    // --- ANIMATED TIMELINE ON SCROLL ---
    const timelineItems = document.querySelectorAll('.timeline-container');
    const timelineObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }); // Trigger a bit before it's fully in view
    timelineItems.forEach(item => timelineObserver.observe(item));


    // --- STARFIELD BACKGROUND FOR HERO ---
    const starsContainer = document.getElementById('stars-container');
    if (starsContainer) {
        const numStars = 150; // Adjust for density
        for (let i = 0; i < numStars; i++) {
            let star = document.createElement('div');
            star.className = 'star';
            star.style.top = Math.random() * 100 + '%';
            star.style.left = Math.random() * 100 + '%';
            star.style.width = Math.random() * 2 + 1 + 'px'; // Star size
            star.style.height = star.style.width;
            star.style.animationDuration = Math.random() * 2 + 3 + 's'; // Twinkle speed
            star.style.animationDelay = Math.random() * 3 + 's'; // Stagger twinkle
            starsContainer.appendChild(star);
        }
    }

    // --- CONTACT FORM SUBMISSION WITH FORMSPREE ---
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(contactForm);
            formStatus.innerHTML = 'Sending transmission... <div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
            formStatus.className = 'mt-3 text-center'; // Reset classes

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    formStatus.textContent = 'Transmission successful! We will get back to you from our starbase.';
                    formStatus.classList.add('success');
                    contactForm.reset();
                } else {
                    const data = await response.json();
                    if (Object.hasOwn(data, 'errors')) {
                        formStatus.textContent = data["errors"].map(error => error["message"]).join(", ");
                    } else {
                        formStatus.textContent = 'Oops! Transmission failed. Please check your coordinates and try again.';
                    }
                    formStatus.classList.add('error');
                }
            } catch (error) {
                formStatus.textContent = 'Error in transmission link. Please try again later.';
                formStatus.classList.add('error');
            }
        });
    }

    console.log("MCICTS.lk Spaceport initialized! Systems nominal.");
});