document.addEventListener("DOMContentLoaded", () => {

    // Favicon
    let favicon = document.querySelector("link[rel~='icon']");
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    favicon.href = '/bilder/thumbs/favicon.png';



    // Navigation
    document.body.insertAdjacentHTML("afterbegin", `
        <nav class="site-navigation">
            <a href="/index" class="nav-logo">
                <img src="/bilder/thumbs/emblemwhite.png" alt="Royal Rangers Emblem">
            </a>
            <div class="nav-links" id="nav-links">
                <a href="/index"><i class="fas fa-home"></i> Startseite</a>
                <a href="#" data-area="aktionen" data-url="/bereiche/aktionen"><i class="fas fa-campground"></i> Aktionen & Camps</a>
                <a href="#" data-area="team"     data-url="/bereiche/team"><i class="fas fa-paw"></i> Rennmäuse/Forscher</a>
                <a href="#" data-area="privat"   data-url="/bereiche/privat"><i class="fas fa-lock"></i> Private Bilder</a>
            </div>
            <button class="theme-toggle" id="theme-toggle" title="Dark Mode umschalten">
                <i class="fas fa-moon"></i>
            </button>
            <div class="menu-toggle" id="mobile-menu">
                <i class="fas fa-bars"></i>
            </div>
        </nav>
    `);

    // Passwort-Popup
    document.body.insertAdjacentHTML("beforeend", `
        <div id="pw-popup" class="modal-overlay hidden">
            <div class="modal-content">
                <span id="pw-popup-close" class="modal-close"><i class="fas fa-times"></i></span>
                <h3><i class="fas fa-lock"></i> Passwort erforderlich</h3>
                <input id="pw-popup-input" type="password" placeholder="Passwort"
                    style="width:90%; padding:10px; border-radius:8px; margin: 15px 0;">
                <div style="margin-top:15px; display:flex; gap:10px; justify-content:center;">
                    <button id="pw-popup-cancel"  class="download-btn btn-gray">Abbrechen</button>
                    <button id="pw-popup-confirm" class="download-btn">Öffnen</button>
                </div>
            </div>
        </div>
    `);

    // Fehler-Popup
    document.body.insertAdjacentHTML("beforeend", `
        <div id="error-popup" class="modal-overlay hidden" style="z-index: 20000;">
            <div class="modal-content" style="max-width: 300px; padding: 20px;">
                <h3 class="error-title">Fehler</h3>
                <p id="error-message" style="margin: 15px 0;">Falsches Passwort!</p>
                <button id="error-popup-close" class="download-btn btn-gray">Schließen</button>
            </div>
        </div>
    `);

    // Footer
    document.body.insertAdjacentHTML("beforeend", `
        <footer class="site-footer">
            <div class="footer-wrapper">
                <div class="footer-sec">
                    <h3>Kontakt</h3>
                    <p><a href="mailto:tim_thiel@r-rangers.de" class="footer-link-white">
                        <i class="fas fa-envelope footer-icon"></i>tim_thiel@r-rangers.de
                    </a></p>
                    <p><a href="https://www.r-rangers.de" target="_blank" class="footer-link-white">
                        <i class="fas fa-globe footer-icon"></i>www.r-rangers.de
                    </a></p>
                </div>
                <div class="footer-sec">
                    <h3>Social Media</h3>
                    <div class="social-links">
                        <a href="https://www.instagram.com/timthiel_" target="_blank" class="insta-icon-link">
                            <i class="fa-brands fa-instagram"></i>
                        </a>
                    </div>
                </div>
                <div class="footer-sec">
                    <h3>Rechtliches</h3>
                    <ul class="footer-nav-list">
                        <li><a href="/index">Startseite</a></li>
                        <li><a href="/rechtliches/impressum">Impressum</a></li>
                        <li><a href="/rechtliches/datenschutz">Datenschutz</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom-bar">&copy; 2026 Tim Thiel</div>
        </footer>
    `);


    // Aktiven Navigationspunkt markieren (Logo ausschließen)
    const path = window.location.pathname;
    document.querySelectorAll("nav.site-navigation a:not(.nav-logo)").forEach(link => {
        const target = link.dataset.url || link.getAttribute("href");
        if (target && target !== "#" && path.startsWith(target)) {
            link.classList.add("active");
        }
    });

    // Navigationslinks mit Auth
    document.querySelectorAll("nav.site-navigation a[data-area]").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            openArea(link.dataset.area, link.dataset.url);
        });
    });

    // Passwort-Popup schließen (X-Button)
    document.getElementById("pw-popup-close").addEventListener('click', closePopupClean);

    // Mobile Menü
    document.getElementById("mobile-menu").addEventListener('click', () => {
        document.getElementById("nav-links").classList.toggle('active');
    });

    // Dark Mode Toggle
    const themeToggle = document.getElementById("theme-toggle");
    const updateThemeIcon = () => {
        const isDark = document.documentElement.classList.contains('dark-mode');
        const icon = themeToggle?.querySelector('i');
        if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    };
    updateThemeIcon();
    themeToggle?.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark-mode');
        document.documentElement.classList.toggle('light-mode', !isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcon();
    });
});
