/* auth.js – zentrale Passwortlogik mit Popup und Enter-Taste */

// 🔐 Passwörter mit passwordsgenerator.net/sha256-hash-generator/ generieren und einfügen
const PASSWORDS = {
    aktionen: "9b6fcb3d1877b41b17e0051e1ac4da83e1b20e9c91b73de5abb5189782f6160f",
    team: "126d1337beb85580e514c90bfb75d92b90adb11feec2062ff01868e73f8444bb",
    privat: "8fe9a4033f5d75198b568dd54c6af0824c5dbf00a3d2f9fdedebf2cd3bb2d3cf"
};

// ================= GLOBALE SCHLIESS-FUNKTIONEN =================

// 1. Schließt das Fehler-Popup
function closeErrorPopup() {
    const errorPopup = document.getElementById('error-popup');
    if (errorPopup) errorPopup.classList.add('hidden');
    
    // Fokus zurück auf das Passwort-Feld setzen
    const pwInput = document.getElementById("pw-popup-input");
    if(pwInput) pwInput.focus();
}

// 2. Schließt das Passwort-Eingabe-Popup sauber
function closePopupClean() {
    const popup = document.getElementById("pw-popup");
    const input = document.getElementById("pw-popup-input");
    const btnOpen = document.getElementById("pw-popup-confirm");
    const btnCancel = document.getElementById("pw-popup-cancel");

    // Pop-up verstecken
    if (popup) popup.classList.add("hidden");
    if (input) input.value = "";

    // Temporäre Listener entfernen
    if (btnOpen) btnOpen.onclick = null;
    if (input) input.onkeydown = null;
    if (btnCancel) btnCancel.onclick = null;
}

// ================= FEHLER ANZEIGE =================
function showError(message) {
    const errorPopup = document.getElementById('error-popup');
    const errorMessage = document.getElementById('error-message');
    const closeBtn = document.getElementById('error-popup-close'); 

    if (!errorPopup) {
        alert(message);
        return;
    }

    errorMessage.textContent = message;
    errorPopup.classList.remove('hidden');
    
    closeBtn.onclick = closeErrorPopup;
    closeBtn.focus();
}

// ================= HAUPTLOGIK =================
function checkAccess(area) {
    const savedDate = localStorage.getItem("auth_date_" + area);
    if (!savedDate) return false;

    // Das heutige Datum als String (z.B. "2026-02-01")
    const today = new Date().toISOString().split('T')[0];

    // Wenn das gespeicherte Datum mit heute übereinstimmt, gewähre Zugriff
    return savedDate === today;
}

function askPassword(area, onSuccess) {
    const popup = document.getElementById("pw-popup");
    const input = document.getElementById("pw-popup-input");
    const btnOpen = document.getElementById("pw-popup-confirm");
    const btnCancel = document.getElementById("pw-popup-cancel");

    if (!popup) return;

    popup.classList.remove("hidden");
    input.value = "";
    input.focus();

    const submit = async (e) => {
        if (e) e.preventDefault();
        
        const enteredText = input.value;
        
        // Hash berechnen
        const msgUint8 = new TextEncoder().encode(enteredText);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Nur der Vergleich - keine Logs mehr!
        if (inputHash === PASSWORDS[area]) {
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem("auth_date_" + area, today); 
            closePopupClean();
            onSuccess();  
        } else {
            showError("❌ Falsches Passwort!"); 
            input.value = "";
        }
    };

    btnOpen.onclick = (e) => submit(e);

    input.onkeydown = (e) => {
        if (e.key === "Enter") {
            submit(e);
        }
    };

    btnCancel.onclick = closePopupClean;
}

function openArea(area, url) {
    if (checkAccess(area)) {
        window.location.href = url;
    } else {
        askPassword(area, () => {
            window.location.href = url;
        });
    }
}

// ================= NEU: EIGENER ESC-HANDLER FÜR AUTH =================
document.addEventListener("keydown", (e) => {
    if (e.key === 'Escape') {
        // 1. Fehler-Popup schließen (höchste Priorität)
        const errorPopup = document.getElementById('error-popup');
        if (errorPopup && !errorPopup.classList.contains('hidden')) {
            closeErrorPopup();
            return; // Stoppt hier, damit nicht auch das Passwort-Fenster zugeht
        }

        // 2. Passwort-Popup schließen
        const pwPopup = document.getElementById("pw-popup");
        if (pwPopup && !pwPopup.classList.contains('hidden')) {
            closePopupClean();
        }
    }
});
