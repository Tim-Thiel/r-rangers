/* galerie.js – Galerie mit lokalen Bildern von Netcup */

let galleryImages  = [];
let originalImages = [];
let currentIndex   = 0;
let modalOverlay;
let startDownloadBtn;

const downloadHinweisHTML = `
    <p><i class="fas fa-exclamation-triangle" style="color:#f1c40f;"></i> <strong>Nur für private Nutzung!</strong></p>
    <p>Die Bilder dürfen <strong>nicht veröffentlicht</strong> oder <strong>an Dritte weitergegeben</strong> werden.</p>
    <p>Bestätige die Einhaltung dieser Regelung mit<br>'Download starten'.</p>
`;

const params = new URLSearchParams(window.location.search);
let bereich  = params.get('bereich') || '';
let id       = params.get('id')      || '';
let titel    = params.get('titel')   || '';

// Fallback: bereich/id aus sauberer URL lesen (z.B. nach Seiten-Reload)
if (!bereich || !id) {
    const parts = window.location.pathname.split('/').filter(Boolean);
    // Erwartet: ['bereiche', 'aktionen', 'slk_tag2026']
    if (parts.length >= 3 && parts[0] === 'bereiche') {
        bereich = bereich || parts[1];
        id      = id      || parts[2];
    }
}

// Titel: aus URL-Param speichern, oder aus localStorage wiederherstellen
const titleKey = `gallery_title_${bereich}_${id}`;
if (titel) {
    localStorage.setItem(titleKey, titel);
} else {
    titel = localStorage.getItem(titleKey) || 'Galerie';
}

// Saubere URL anzeigen (statt ?bereich=...&id=...&titel=...)
if (bereich && id) {
    history.replaceState(null, '', `/bereiche/${bereich}/${id}`);
}

// === GLOBALE FUNKTIONEN ===

window.toggleMobileControls = function () {
    const gallery = document.getElementById("gallery");
    const btn     = document.getElementById("toggleControlsBtn");
    const visible = gallery.classList.toggle("gallery--controls-visible");
    btn.innerHTML = visible
        ? '<i class="fas fa-check-square"></i> Auswählen ausblenden'
        : '<i class="fas fa-check-square"></i> Auswählen einblenden';
};

window.toggleAllCheckboxes = function () {
    const boxes = document.querySelectorAll(".img-checkbox");
    if (boxes.length === 0) return;
    const allChecked = Array.from(boxes).every(cb => cb.checked);
    boxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.closest(".gallery-item")?.classList.toggle("selected", !allChecked);
    });
    document.getElementById('toggleAllBtn').textContent = allChecked ? "Alle auswählen" : "Alle abwählen";
};

window.downloadSelected = function () {
    const checked = document.querySelectorAll(".img-checkbox:checked");
    if (checked.length === 0) {
        showModalContent("Achtung!", "<p>Bitte wähle zuerst mindestens ein Bild aus.</p>", false);
        return;
    }
    showModalContent("Wichtiger Download-Hinweis!", downloadHinweisHTML, true, triggerZipDownload);
};

window.closeDownloadModal = function () {
    if (modalOverlay) {
        modalOverlay.classList.add('hidden');
        if (window.history.state?.popup) window.history.back();
    }
};

window.openLightbox = function (idx) {
    currentIndex = idx;
    const lb    = document.getElementById("lightbox");
    const lbImg = document.getElementById("lightbox-img");
    if (lb) {
        lb.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        window.history.pushState({ popup: "lightbox" }, "");
    }
    if (lbImg) {
        lbImg.style.opacity = "0";
    }
    updateLightboxImage();
};

function closeLightbox() {
    const lb    = document.getElementById("lightbox");
    const lbImg = document.getElementById("lightbox-img");
    if (!lb || lb.classList.contains("hidden")) return;
    lbImg.style.opacity   = "0";
    lbImg.style.transform = "scale(0.985)";
    setTimeout(() => {
        lb.classList.add("hidden");
        document.body.style.overflow = "";
    }, 100);
}

// === GALERIE LADEN ===

async function loadGallery() {
    const gallery = document.getElementById("gallery");
    if (!gallery || !bereich || !id) {
        if (gallery) gallery.innerHTML = "<p>Ungültige Galerie-Parameter.</p>";
        return;
    }

    document.title = `R-Rangers – ${titel}`;
    document.getElementById("galerie-titel").textContent = titel;

    try {
        const response = await fetch(`/api/bilder.php?bereich=${encodeURIComponent(bereich)}&id=${encodeURIComponent(id)}`);

        if (response.status === 401) {
            localStorage.removeItem("auth_date_" + bereich);
            askPassword(bereich, loadGallery);
            return;
        }

        const data = await response.json();

        if (!data.images || data.images.length === 0) {
            gallery.innerHTML = "<p>Keine Bilder gefunden.</p>";
            return;
        }

        gallery.innerHTML = "";
        galleryImages  = [];
        originalImages = [];

        data.images.forEach((entry, idx) => {
            galleryImages.push(entry.lightbox);
            originalImages.push(entry.original);

            const cleanName = entry.original.split('/').pop();
            const card = document.createElement("div");
            card.className = "gallery-item gallery-item--entering";
            card.style.animationDelay = `${Math.min(idx * 40, 600)}ms`;
            card.onclick = () => openLightbox(idx);

            card.innerHTML = `
                <img src="${entry.thumb}" alt="${cleanName}" loading="lazy">
                <label class="gallery-select-btn" title="Auswählen" onclick="event.stopPropagation()">
                    <input type="checkbox" class="img-checkbox" value="${entry.original}">
                    <i class="fas fa-check gallery-select-icon"></i>
                </label>
                <a href="#" class="gallery-dl-btn" title="Herunterladen"><i class="fas fa-download"></i></a>
            `;

            card.querySelector(".img-checkbox").addEventListener("change", e => {
                card.classList.toggle("selected", e.target.checked);
            });

            card.querySelector(".gallery-dl-btn").onclick = e => {
                e.preventDefault();
                e.stopPropagation();
                showModalContent("Wichtiger Download-Hinweis!", downloadHinweisHTML, true,
                    () => triggerSingleDownload(entry.original, cleanName));
            };

            gallery.appendChild(card);

            // Masonry: Grid-Span anhand des Seitenverhältnisses setzen
            const img = card.querySelector('img');
            const setSpan = () => {
                if (!img.naturalWidth) return;
                const ratio  = img.naturalHeight / img.naturalWidth;
                const spans  = Math.ceil((card.offsetWidth * ratio + 10) / 20);
                card.style.gridRowEnd = `span ${spans}`;
            };
            if (img.complete && img.naturalHeight) setSpan();
            else img.addEventListener('load', setSpan);
        });

        // Lightbox erst vorladen wenn Browser idle (Galerie hat Vorrang)
        const preloadLightbox = () => galleryImages.forEach(src => { new Image().src = src; });
        if ('requestIdleCallback' in window) {
            requestIdleCallback(preloadLightbox);
        } else {
            setTimeout(preloadLightbox, 1500);
        }

    } catch (err) {
        console.error("Fehler beim Laden der Bilder:", err);
        gallery.innerHTML = "<p>Bilder konnten nicht geladen werden.</p>";
    }
}

// === LIGHTBOX ===

function updateLightboxImage(direction) {
    const lbImg       = document.getElementById("lightbox-img");
    const lbContainer = document.getElementById("lightbox");
    if (!lbImg || !lbContainer) return;

    const target  = galleryImages[currentIndex];
    const isSwipe = direction === 'left' || direction === 'right';

    if (isSwipe) {
        // Wisch-Animation: aktuelles Bild rausschieben
        const exitX  = direction === 'left' ? '-60%' : '60%';
        const enterX = direction === 'left' ?  '60%' : '-60%';
        lbImg.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
        lbImg.style.opacity    = '0';
        lbImg.style.transform  = `translateX(${exitX})`;

        setTimeout(() => {
            // Neues Bild unsichtbar auf der Gegenseite positionieren
            lbImg.style.transition = 'none';
            lbImg.style.transform  = `translateX(${enterX})`;
            lbImg.style.opacity    = '0';

            const doEnter = () => {
                // Reflow erzwingen, damit transition:none + enterX-Position committed sind
                // bevor wir die Animation starten (verhindert falsches Einwischen)
                void lbImg.getBoundingClientRect();
                lbImg.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
                lbImg.style.opacity    = '1';
                lbImg.style.transform  = 'translateX(0)';
                lbContainer.classList.remove('loading');
            };

            lbImg.onload = () => {
                if (galleryImages[currentIndex] !== target) return;
                doEnter();
            };
            lbImg.src = target;
            if (!lbImg.complete || lbImg.naturalWidth === 0) {
                lbContainer.classList.add('loading');
            }
        }, 110);
    } else {
        // Zoom-Animation (Desktop / Tastatur / Pfeile)
        lbImg.style.transition = 'opacity 0.1s ease, transform 0.1s ease';
        lbImg.style.opacity    = "0";
        lbImg.style.transform  = "scale(0.985)";

        setTimeout(() => {
            lbImg.onload = () => {
                if (galleryImages[currentIndex] !== target) return;
                lbContainer.classList.remove("loading");
                lbImg.style.opacity   = "1";
                lbImg.style.transform = "scale(1)";
            };
            lbImg.src = target;
            if (!lbImg.complete || lbImg.naturalWidth === 0) {
                lbContainer.classList.add("loading");
            }
        }, 80);
    }
}

// === DOWNLOAD ===

async function triggerSingleDownload(url, filename) {
    const bodyElem = document.getElementById("modalBody");
    const startBtn = document.getElementById("startDownloadBtn");
    startBtn.style.display = "none";
    bodyElem.innerHTML = `<p>Bild wird vorbereitet...</p><span id="statusText">Lade Daten...</span>`;
    try {
        const blob = await fetch(url).then(r => r.blob());
        saveAs(blob, filename);
        document.getElementById("statusText").innerText = "Fertig!";
        setTimeout(() => closeDownloadModal(), 800);
    } catch {
        bodyElem.innerHTML = "<p>Fehler beim Download.</p>";
    }
}

async function triggerZipDownload() {
    const checked = document.querySelectorAll(".img-checkbox:checked");
    const zip     = new JSZip();
    const total   = checked.length;

    const bodyElem = document.getElementById("modalBody");
    const startBtn = document.getElementById("startDownloadBtn");
    startBtn.style.display = "none";
    bodyElem.innerHTML = `
        <p>Bilder werden für den ZIP-Download vorbereitet...</p>
        <div class="progress-container" style="display: block;">
            <div id="pBar" class="progress-bar"></div>
        </div>
        <span id="statusText">0 von ${total} Bildern geladen</span>
    `;

    const pBar  = document.getElementById("pBar");
    const sText = document.getElementById("statusText");
    let count = 0;

    for (const box of checked) {
        try {
            const blob = await fetch(box.value).then(r => r.blob());
            zip.file(box.value.split('/').pop(), blob);
            count++;
            pBar.style.width = (count / total * 100) + "%";
            sText.innerText = `${count} von ${total} Bildern geladen`;
        } catch { console.error("Fehler bei Bild:", box.value); }
    }

    sText.innerText = "ZIP-Archiv wird erstellt...";
    saveAs(await zip.generateAsync({ type: "blob" }), titel.replace(/\s+/g, '_') + ".zip");
    setTimeout(() => closeDownloadModal(), 1000);
}

function showModalContent(title, html, showButton, action = null) {
    if (!modalOverlay) return;
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalBody").innerHTML    = html;
    startDownloadBtn.style.display = showButton ? "inline-block" : "none";
    if (showButton) startDownloadBtn.onclick = action;
    modalOverlay.classList.remove('hidden');
    window.history.pushState({ popup: "modal" }, "");
}

// === BACK-BUTTON (Handy-Fix) ===
window.addEventListener("popstate", (event) => {
    const lb    = document.getElementById("lightbox");
    const modal = document.getElementById('downloadModal');
    if (!event.state?.popup) {
        lb?.classList.add("hidden");
        modal?.classList.add('hidden');
        document.body.style.overflow = "";
        return;
    }
    if (event.state.popup === "lightbox") {
        modal?.classList.add('hidden');
        lb?.classList.remove("hidden");
    }
});

// === INIT ===
document.addEventListener("DOMContentLoaded", () => {
    modalOverlay     = document.getElementById('downloadModal');
    startDownloadBtn = document.getElementById('startDownloadBtn');

    // Auth-Check mit schönem Popup (nav.js ist jetzt geladen)
    if (checkAccess(bereich)) {
        loadGallery();
    } else {
        askPassword(bereich, loadGallery);
    }

    // Lightbox-Navigation
    document.querySelector(".lightbox-next")?.addEventListener("click", e => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % galleryImages.length;
        updateLightboxImage();
    });
    document.querySelector(".lightbox-prev")?.addEventListener("click", e => {
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
        updateLightboxImage();
    });

    // Klick neben das Bild schließt Lightbox
    document.getElementById("lightbox")?.addEventListener("click", e => {
        if (e.target === document.getElementById("lightbox")) {
            closeLightbox();
            if (window.history.state?.popup) window.history.back();
        }
    });

    // Echtzeit-Drag für mobile Lightbox-Navigation
    const lb = document.getElementById("lightbox");
    const lbImgEl = document.getElementById("lightbox-img");
    let touchStartX = 0, touchStartY = 0, isDragging = false;

    lb?.addEventListener("touchstart", e => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
        isDragging  = true;
        if (lbImgEl) lbImgEl.style.transition = 'none';
    }, { passive: true });

    lb?.addEventListener("touchmove", e => {
        if (!isDragging || !lbImgEl) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        // Vertikale Geste → abbrechen
        if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 15) {
            isDragging = false;
            lbImgEl.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            lbImgEl.style.transform  = 'translateX(0)';
            lbImgEl.style.opacity    = '1';
            return;
        }
        lbImgEl.style.transform = `translateX(${dx}px)`;
        lbImgEl.style.opacity   = String(Math.max(0.6, 1 - Math.abs(dx) / window.innerWidth));
    }, { passive: true });

    const cancelDrag = () => {
        if (!isDragging || !lbImgEl) return;
        isDragging = false;
        lbImgEl.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        lbImgEl.style.transform  = 'translateX(0)';
        lbImgEl.style.opacity    = '1';
    };
    lb?.addEventListener("touchcancel", cancelDrag, { passive: true });

    lb?.addEventListener("touchend", e => {
        if (!isDragging || !lbImgEl) return;
        isDragging = false;
        const dx = e.changedTouches[0].clientX - touchStartX;

        if (Math.abs(dx) < 60) {
            // Zu wenig gewischt → zurückschnappen
            lbImgEl.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            lbImgEl.style.transform  = 'translateX(0)';
            lbImgEl.style.opacity    = '1';
            return;
        }

        // Index aktualisieren
        if (dx < 0) {
            currentIndex = (currentIndex + 1) % galleryImages.length;
        } else {
            currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
        }
        const newTarget = galleryImages[currentIndex];
        const exitX  = dx < 0 ? '-110%' : '110%';
        const enterX = dx < 0 ?  '110%' : '-110%';

        // Aktuelles Bild zügig rausschieben (von der aktuellen Position aus)
        lbImgEl.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
        lbImgEl.style.transform  = `translateX(${exitX})`;
        lbImgEl.style.opacity    = '0';

        setTimeout(() => {
            lbImgEl.style.transition = 'none';
            lbImgEl.style.transform  = `translateX(${enterX})`;
            lbImgEl.style.opacity    = '0';

            const doEnter = () => {
                void lbImgEl.getBoundingClientRect();
                lbImgEl.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
                lbImgEl.style.opacity    = '1';
                lbImgEl.style.transform  = 'translateX(0)';
                document.getElementById("lightbox")?.classList.remove('loading');
            };

            lbImgEl.onload = () => {
                if (galleryImages[currentIndex] !== newTarget) return;
                doEnter();
            };
            lbImgEl.src = newTarget;
            if (!lbImgEl.complete || lbImgEl.naturalWidth === 0) {
                document.getElementById("lightbox")?.classList.add('loading');
            }
        }, 110);
    }, { passive: true });

    document.getElementById("lightbox-download-btn")?.addEventListener("click", e => {
        e.preventDefault();
        const url = originalImages[currentIndex];
        showModalContent("Wichtiger Download-Hinweis!", downloadHinweisHTML, true,
            () => triggerSingleDownload(url, url.split('/').pop()));
    });

    document.querySelector(".lightbox-close")?.addEventListener("click", () => {
        closeLightbox();
        if (window.history.state?.popup) window.history.back();
    });

    document.addEventListener("keydown", e => {
        const modal = document.getElementById('downloadModal');
        const lb    = document.getElementById("lightbox");
        if (e.key === "Escape") {
            if (modal && !modal.classList.contains("hidden")) {
                window.closeDownloadModal();
            } else if (lb && !lb.classList.contains("hidden")) {
                closeLightbox();
                if (window.history.state?.popup === "lightbox") window.history.back();
            }
        }
        if (lb && !lb.classList.contains("hidden")) {
            if (e.key === "ArrowRight") { currentIndex = (currentIndex + 1) % galleryImages.length; updateLightboxImage(); }
            if (e.key === "ArrowLeft")  { currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length; updateLightboxImage(); }
        }
    });

    const scrollTopBtn = document.getElementById("scrollTopBtn");
    window.addEventListener('scroll', () => {
        scrollTopBtn.style.display =
            (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) ? "block" : "none";
    });
    scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // Masonry-Spans bei Fenstergröße-Änderung neu berechnen (einmalig registrieren, nicht pro loadGallery-Aufruf)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            document.querySelectorAll('.gallery-item').forEach(item => {
                const img = item.querySelector('img');
                if (img && img.complete && img.naturalWidth) {
                    const ratio = img.naturalHeight / img.naturalWidth;
                    const spans = Math.ceil((item.offsetWidth * ratio + 10) / 20);
                    item.style.gridRowEnd = `span ${spans}`;
                }
            });
        }, 100);
    });
});
