# Feilsøking av SmartStream Filter

## 1. Reload Extension
- Gå til `chrome://extensions/`
- Finn SmartStream Filter
- Klikk på reload-knappen (sirkulær pil)

## 2. Sjekk Service Worker Console
- På extensions-siden, klikk på "Service Worker" linken under SmartStream Filter
- Se etter feilmeldinger i konsollen

## 3. Test Popup
- Klikk på extension-ikonet i verktøylinjen
- Høyreklikk på popup og velg "Inspect"
- I konsollen skal du se: `[SmartStream] Popup initializing`
- Sjekk om det er andre feilmeldinger

## 4. Test på YouTube
- Gå til https://www.youtube.com
- Åpne Developer Tools (F12)
- Gå til Console
- Du skal se: `[SmartStream] Initializing YouTube filter`
- Etter noen sekunder: `[SmartStream] Found header, creating controls`

## 5. Vanlige problemer og løsninger:

### Problem: Ingenting vises i YouTube header
- Sjekk om du ser console.log meldingene
- YouTube kan ha endret HTML-struktur
- Prøv å refreshe siden (Ctrl+F5)

### Problem: Popup sliders fungerer ikke
- Sjekk for JavaScript-feil i popup console
- Verifiser at service worker kjører

### Problem: "Cannot read properties of null"
- Dette betyr at HTML-elementer ikke blir funnet
- Sjekk at ID-ene i HTML matcher TypeScript-koden

## 6. Rapporter tilbake:
Fortell meg hvilke console.log meldinger du ser (eller ikke ser), og eventuelle feilmeldinger.