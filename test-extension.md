# Feilsøking av SmartStream Filter

## Sjekk følgende:

### 1. Åpne Extension Service Worker konsoll:
- Gå til `chrome://extensions/` eller `edge://extensions/`
- Finn SmartStream Filter
- Klikk på "Service Worker" link
- Sjekk for feilmeldinger

### 2. Sjekk Content Script på YouTube:
- Gå til YouTube
- Åpne Developer Tools (F12)
- Gå til Console
- Se etter feilmeldinger fra content script

### 3. Sjekk Popup:
- Klikk på extension-ikonet
- Høyreklikk og velg "Inspect" på popup
- Sjekk Console for feil

## Vanlige problemer:
- Manglende CSS import i content script
- DOMContentLoaded timing issues
- Chrome API permissions