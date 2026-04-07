/* galerie.js – Galerie mit lokalen Bildern von Netcup */

let galleryImages  = [];
let originalImages = [];
let currentIndex   = 0;
let modalOverlay;
let startDownloadBtn;

const downloadHinweisHTML = `
    <p>⚠️ <strong>Nur für private Nutzung!</strong></p>
    <p>Die Bilder dürfen <strong>nicht veröffentlicht</strong> oder <strong>an Dritte weitergegeben</strong> werden.</p>
    <p>Bestätige die Einhaltung dieser Regelung mit<br>'Download starten'.</p>
`;

const params  = new URLSearchParams(window.location.search);
const bereich = params.get('bereich') || '';
const id      = params.get('id')      || '';
const titel   = params.get('titel')   || 'Galerie';

// Saubere URL anzeigen (statt ?bereich=...&id=...&titel=...)
if (bereich && id) {
    history.replaceState(null, '', `/bereiche/${bereich}/${id}`);
}

// === GLOBALE FUNKTIONEN ===

window.toggleAllCheckboxes = function () {
    const boxes = document.querySelectorAll(".img-checkbox");
    if (boxes.length === 0) return;
    const allChecked = Array.from(boxes).every(cb => cb.checked);
    boxes.forEach(cb => cb.checked = !allChecked);
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
    const lb = document.getElementById("lightbox");
    if (lb) {
        lb.classList.remove("hidden");
        window.history.pushState({ popup: "lightbox" }, "");
    }
    updateLightboxImage();
};

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
            card.className = "gallery-item";
            card.onclick = () => openLightbox(idx);

            card.innerHTML = `
                <img src="${entry.thumb}" alt="${cleanName}" loading="lazy">
                <div class="checkbox-container">
                    <label><input type="checkbox" class="img-checkbox" value="${entry.original}"> Auswählen</label>
                </div>
                <a href="#" class="download-btn">Download</a>
            `;

            card.querySelector(".checkbox-container").onclick = e => e.stopPropagation();
            card.querySelector(".download-btn").onclick = e => {
                e.preventDefault();
                e.stopPropagation();
                showModalContent("Wichtiger Download-Hinweis!", downloadHinweisHTML, true,
                    () => triggerSingleDownload(entry.original, cleanName));
            };

            gallery.appendChild(card);
        });

    } catch (err) {
        console.error("Fehler beim Laden der Bilder:", err);
        gallery.innerHTML = "<p>Bilder konnten nicht geladen werden.</p>";
    }
}

// === LIGHTBOX ===

function updateLightboxImage() {
    const lbImg      = document.getElementById("lightbox-img");
    const lbContainer = document.getElementById("lightbox");
    if (!lbImg || !lbContainer) return;

    lbImg.src = "";
    lbImg.style.opacity = "0";
    lbContainer.classList.add("loading");
    lbImg.src = galleryImages[currentIndex];
    lbImg.onload = () => {
        lbContainer.classList.remove("loading");
        lbImg.style.opacity = "1";
    };
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

    document.getElementById("lightbox-download-btn")?.addEventListener("click", e => {
        e.preventDefault();
        const url = originalImages[currentIndex];
        showModalContent("Wichtiger Download-Hinweis!", downloadHinweisHTML, true,
            () => triggerSingleDownload(url, url.split('/').pop()));
    });

    document.querySelector(".lightbox-close")?.addEventListener("click", () => {
        document.getElementById("lightbox").classList.add("hidden");
        if (window.history.state?.popup) window.history.back();
    });

    document.addEventListener("keydown", e => {
        const modal = document.getElementById('downloadModal');
        const lb    = document.getElementById("lightbox");
        if (e.key === "Escape") {
            if (modal && !modal.classList.contains("hidden")) {
                window.closeDownloadModal();
            } else if (lb && !lb.classList.contains("hidden")) {
                lb.classList.add("hidden");
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
});
