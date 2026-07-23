/* script.js — Alles Fix & Fertig inkl. Handy-Zurück-Fix */

const cloudName = "db4arm1o7"; 
let galleryImages = [];    
let originalImages = [];   
let currentIndex = 0;

let modalOverlay;
let startDownloadBtn;

// Einheitlicher Text-Baustein für das Modal
const downloadHinweisHTML = `
    <p>⚠️ <strong>Nur für private Nutzung!</strong></p>
    <p>Die Bilder dürfen <strong>nicht veröffentlicht</strong> oder <strong>an Dritte weitergegeben</strong> werden.</p>
    <p>Bestätige die Einhaltung dieser Regelung mit<br>'Download starten'.</p>
`;

// === GLOBALE FUNKTIONEN ===

window.toggleAllCheckboxes = function() {
    const boxes = document.querySelectorAll(".img-checkbox");
    if (boxes.length === 0) return;
    const allChecked = Array.from(boxes).every(cb => cb.checked);
    boxes.forEach(cb => cb.checked = !allChecked);
    const btn = document.getElementById('toggleAllBtn');
    if (btn) btn.textContent = allChecked ? "Alle auswählen" : "Alle abwählen";
};

window.downloadSelected = function() {
    const checked = document.querySelectorAll(".img-checkbox:checked");
    if (checked.length === 0) {
        showModalContent("Achtung!", "<p>Bitte wähle zuerst mindestens ein Bild aus.</p>", false);
        return;
    }
    showModalContent("Wichtiger Download-Hinweis!", downloadHinweisHTML, true, triggerZipDownload);
};

window.closeDownloadModal = function() {
    if (modalOverlay) {
        modalOverlay.classList.add('hidden');
        // Wenn das Modal manuell geschlossen wird, bereinigen wir den Verlaufseintrag
        if (window.history.state && window.history.state.popup) {
            window.history.back();
        }
    }
};

window.openLightbox = function(idx) {
    currentIndex = idx;
    const lb = document.getElementById("lightbox");
    if (lb) {
        lb.classList.remove("hidden");
        // NEU: Virtuellen Eintrag im Verlauf erstellen für die Handy-Zurück-Taste
        window.history.pushState({ popup: "lightbox" }, "");
    }
    updateLightboxImage();
};

// === INTERNE LOGIK ===

async function loadGallery() {
    const gallery = document.getElementById("gallery");
    const tag = document.body.getAttribute("data-action");
    if (!gallery || !tag) return;

    const listUrl = `https://res.cloudinary.com/${cloudName}/image/list/${tag}.json`;

    try {
        const response = await fetch(listUrl);
        const data = await response.json();
        const files = data.resources.sort((a, b) => a.public_id.localeCompare(b.public_id));

        gallery.innerHTML = "";
        galleryImages = [];
        originalImages = [];

        files.forEach((file, idx) => {
            const thumbUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_400,c_scale,f_auto,q_auto:eco/v${file.version}/${file.public_id}.${file.format}`;
            const lightboxUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_1600,c_limit,f_auto,q_auto:low/v${file.version}/${file.public_id}.${file.format}`;
            const originalUrl = `https://res.cloudinary.com/${cloudName}/image/upload/v${file.version}/${file.public_id}.${file.format}`;

            galleryImages.push(lightboxUrl); 
            originalImages.push(originalUrl);

            const cleanName = file.public_id.split('/').pop() + "." + file.format;

            const card = document.createElement("div");
            card.className = "gallery-item";
            
            // Wir legen das onclick direkt auf das Element-Objekt, das ist sicherer
            card.onclick = () => openLightbox(idx);

            card.innerHTML = `
                <img src="${thumbUrl}" alt="${cleanName}" loading="lazy">
                <div class="checkbox-container">
                    <label><input type="checkbox" class="img-checkbox" value="${originalUrl}"> Auswählen</label>
                </div>
                <a href="#" class="download-btn">Download</a>
            `;

            // Stoppt das Öffnen der Lightbox beim Klick auf Checkbox oder Button
            const checkboxCont = card.querySelector(".checkbox-container");
            const dlBtn = card.querySelector(".download-btn");

            checkboxCont.onclick = (e) => e.stopPropagation();
            
            dlBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                showModalContent("Wichtiger Download-Hinweis!", downloadHinweisHTML, true, () => triggerSingleDownload(originalUrl, cleanName));
            };

            gallery.appendChild(card);
        });
    } catch (err) { 
        console.error("Fehler beim Laden der Cloudinary-Liste:", err);
        gallery.innerHTML = "<p>Bilder konnten nicht geladen werden.</p>";
    }
}

function updateLightboxImage() {
    const lbImg = document.getElementById("lightbox-img");
    if (lbImg) {
        lbImg.src = ""; // Löscht das alte Bild aus dem Speicher des Elements
        lbImg.style.opacity = "0"; // Optional: Macht es unsichtbar für den nächsten Start
    }
    const lbContainer = document.getElementById("lightbox");
    if (!lbImg || !lbContainer) return;
    
    lbContainer.classList.add("loading");
    lbImg.style.opacity = "0"; 
    
    lbImg.src = galleryImages[currentIndex];
    
    lbImg.onload = () => { 
        lbContainer.classList.remove("loading");
        lbImg.style.opacity = "1"; 
    };
}

async function triggerSingleDownload(url, filename) {
    const bodyElem = document.getElementById("modalBody");
    const startBtn = document.getElementById("startDownloadBtn");
    
    startBtn.style.display = "none";
    bodyElem.innerHTML = `<p>Bild wird vorbereitet...</p><span id="statusText">Lade Daten...</span>`;

    try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        saveAs(blob, filename);
        
        document.getElementById("statusText").innerText = "Fertig!";
        setTimeout(() => closeDownloadModal(), 800);
    } catch (err) {
        bodyElem.innerHTML = "<p>Fehler beim Download.</p>";
    }
}

async function triggerZipDownload() {
    const checked = document.querySelectorAll(".img-checkbox:checked");
    const zip = new JSZip();
    const total = checked.length;
    
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

    const pBar = document.getElementById("pBar");
    const sText = document.getElementById("statusText");
    
    let pageTitle = document.querySelector("h1") ? document.querySelector("h1").innerText : "Ranger_Bilder";
    let safeFileName = pageTitle.replace(/\s+/g, '_') + ".zip";

    let count = 0;
    for (let box of checked) {
        try {
            const resp = await fetch(box.value);
            const blob = await resp.blob();
            const fileName = box.value.split('/').pop().split('?')[0];
            zip.file(fileName, blob);
            
            count++;
            const percent = (count / total) * 100;
            pBar.style.width = percent + "%";
            sText.innerText = `${count} von ${total} Bildern geladen`;
        } catch (err) { console.error("Fehler bei Bild:", box.value); }
    }
    
    sText.innerText = "ZIP-Archiv wird erstellt...";
    const content = await zip.generateAsync({type: "blob"});
    saveAs(content, safeFileName);
    
    setTimeout(() => closeDownloadModal(), 1000);
}

function showModalContent(title, html, showButton, action = null) {
    if (!modalOverlay) return;
    const titleElem = document.getElementById("modalTitle") || modalOverlay.querySelector("h3");
    const bodyElem = document.getElementById("modalBody");
    
    if (titleElem) titleElem.textContent = title;
    if (bodyElem) bodyElem.innerHTML = html;
    
    if (showButton) {
        startDownloadBtn.style.display = "inline-block";
        startDownloadBtn.onclick = () => action();
    } else {
        startDownloadBtn.style.display = "none";
    }
    modalOverlay.classList.remove('hidden');
    // NEU: Verlaufseintrag für das Modal
    window.history.pushState({ popup: "modal" }, "");
}

// === BACK-BUTTON HANDLING (Handy-Fix) ===
window.addEventListener("popstate", (event) => {
    const lb = document.getElementById("lightbox");
    const modal = document.getElementById('downloadModal');

    // Wenn kein "popup"-State mehr da ist, alles schließen
    if (!event.state || !event.state.popup) {
        if (lb) lb.classList.add("hidden");
        if (modal) modal.classList.add('hidden');
        return;
    }

    // Wenn der State nur noch "lightbox" ist, muss das Modal zu, aber die LB bleibt offen
    if (event.state.popup === "lightbox") {
        if (modal) modal.classList.add('hidden');
        if (lb) lb.classList.remove("hidden");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    modalOverlay = document.getElementById('downloadModal');
    startDownloadBtn = document.getElementById('startDownloadBtn');
    loadGallery();
    
    // Lightbox-Events
    document.querySelector(".lightbox-next")?.addEventListener("click", (e) => { 
        e.stopPropagation(); currentIndex = (currentIndex + 1) % galleryImages.length; updateLightboxImage();
    });
    document.querySelector(".lightbox-prev")?.addEventListener("click", (e) => { 
        e.stopPropagation(); currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length; updateLightboxImage();
    });
    // Neuer Download-Button in der Lightbox
    const lbDownloadBtn = document.getElementById("lightbox-download-btn");
    lbDownloadBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        
        // Wir holen uns die URL des aktuellen Bildes aus dem globalen Array
        const url = originalImages[currentIndex]; 
        const cleanName = url.split('/').pop().split('?')[0];

        // Wir nutzen dein vorhandenes Modal-System
        showModalContent(
            "Wichtiger Download-Hinweis!", 
            downloadHinweisHTML, 
            true, 
            () => triggerSingleDownload(url, cleanName)
        );
    });
    document.querySelector(".lightbox-close")?.addEventListener("click", () => {
        document.getElementById("lightbox").classList.add("hidden");
        // Verlauf korrigieren, wenn manuell über X geschlossen wird
        if (window.history.state && window.history.state.popup) {
            window.history.back();
        }
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { 
            const modal = document.getElementById('downloadModal');
            const lb = document.getElementById("lightbox");

            // Priorität 1: Modal schließen, falls offen
            if (modal && !modal.classList.contains("hidden")) {
                window.closeDownloadModal(); 
            } 
            // Priorität 2: Sonst Lightbox schließen, falls offen
            else if (lb && !lb.classList.contains("hidden")) {
                lb.classList.add("hidden");
                if (window.history.state && window.history.state.popup === "lightbox") {
                    window.history.back();
                }
            }
        }
        
        // Pfeiltasten nur für Lightbox
        const lb = document.getElementById("lightbox");
        if (lb && !lb.classList.contains("hidden")) {
            if (e.key === "ArrowRight") { currentIndex = (currentIndex + 1) % galleryImages.length; updateLightboxImage(); }
            if (e.key === "ArrowLeft") { currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length; updateLightboxImage(); }
        }
    });
    // Scroll-to-Top Logik
    const scrollTopBtn = document.getElementById("scrollTopBtn");

    window.onscroll = function() {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            scrollTopBtn.style.display = "block";
        } else {
            scrollTopBtn.style.display = "none";
        }
    };

    scrollTopBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
});
