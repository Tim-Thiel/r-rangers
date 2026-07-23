// index.js (KORRIGIERT)
// Menü-Karten öffnen Bereiche über das zentrale Auth-System
document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll(".menu-card").forEach(card => {
        card.addEventListener("click", () => {
            
            // 1. URL abrufen (z.B. "bereiche/aktionen.html")
            const url = card.dataset.url; 
            
            // 2. Area extrahieren (z.B. "aktionen")
            const area = url.replace("bereiche/", "").replace(".html", "");
            
            // 3. openArea mit BEIDEN Argumenten aufrufen
            // (area = für Passwort-Check, url = für die Navigation)
            if (typeof openArea === 'function') {
                 openArea(area, url); 
            } else {
                 console.error("openArea ist nicht definiert. auth.js wird nicht geladen.");
                 window.location.href = url; // Notfall-Navigation
            }
        });
    });

});

// Wartet, bis die Seite geladen ist und ändert dann den Tab-Namen
document.addEventListener('DOMContentLoaded', function() {
    document.title = "R-Rangers – Start"; 
});
