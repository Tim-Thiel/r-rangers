/* auth.js – Passwortlogik mit serverseitigem Login */

// Dark Mode sofort anwenden (vor DOM-Rendering, verhindert weißen Blitz)
// Priorität: manuelle Auswahl > System-Einstellung
(function () {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark-mode');
    } else if (saved === 'light') {
        document.documentElement.classList.add('light-mode');
    }
}());

// ================= GLOBALE SCHLIESS-FUNKTIONEN =================

function closeErrorPopup() {
    const errorPopup = document.getElementById('error-popup');
    if (errorPopup) errorPopup.classList.add('hidden');

    const pwInput = document.getElementById("pw-popup-input");
    if (pwInput) pwInput.focus();
}

function closePopupClean() {
    const popup    = document.getElementById("pw-popup");
    const input    = document.getElementById("pw-popup-input");
    const btnOpen  = document.getElementById("pw-popup-confirm");
    const btnCancel = document.getElementById("pw-popup-cancel");

    if (popup)  popup.classList.add("hidden");
    if (input)  input.value = "";

    if (btnOpen)   btnOpen.onclick   = null;
    if (input)     input.onkeydown   = null;
    if (btnCancel) btnCancel.onclick = null;
}

// ================= FEHLER ANZEIGE =================
function showError(message) {
    const errorPopup   = document.getElementById('error-popup');
    const errorMessage = document.getElementById('error-message');
    const closeBtn     = document.getElementById('error-popup-close');

    if (!errorPopup) {
        alert(message);
        return;
    }

    errorMessage.innerHTML = message;
    errorPopup.classList.remove('hidden');

    closeBtn.onclick = closeErrorPopup;
    closeBtn.focus();
}

// ================= HAUPTLOGIK =================
function checkAccess(area) {
    const savedDate = localStorage.getItem("auth_date_" + area);
    if (!savedDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return savedDate === today;
}

function askPassword(area, onSuccess) {
    const popup     = document.getElementById("pw-popup");
    const input     = document.getElementById("pw-popup-input");
    const btnOpen   = document.getElementById("pw-popup-confirm");
    const btnCancel = document.getElementById("pw-popup-cancel");

    if (!popup) return;

    popup.classList.remove("hidden");
    input.value = "";
    input.focus();

    const submit = async () => {
        const password = input.value;

        try {
            const formData = new FormData();
            formData.append('area', area);
            formData.append('password', password);

            const response = await fetch('/api/login.php', { method: 'POST', body: formData });
            const data     = await response.json();

            if (data.ok) {
                const today = new Date().toISOString().split('T')[0];
                localStorage.setItem("auth_date_" + area, today);
                closePopupClean();
                onSuccess();
            } else {
                showError('<i class="fas fa-times-circle"></i> Falsches Passwort!');
                input.value = "";
            }
        } catch {
            showError('<i class="fas fa-times-circle"></i> Verbindungsfehler. Bitte erneut versuchen.');
            input.value = "";
        }
    };

    btnOpen.onclick  = submit;
    input.onkeydown  = (e) => { if (e.key === "Enter") submit(); };
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

// ================= ESC-HANDLER =================
document.addEventListener("keydown", (e) => {
    if (e.key === 'Escape') {
        const errorPopup = document.getElementById('error-popup');
        if (errorPopup && !errorPopup.classList.contains('hidden')) {
            closeErrorPopup();
            return;
        }
        const pwPopup = document.getElementById("pw-popup");
        if (pwPopup && !pwPopup.classList.contains('hidden')) {
            closePopupClean();
        }
    }
});
