# Waar trek jij de grens?

Een socratische leerapp voor burgerschap in het mbo, zonder chatbot. De vraag is: wat mag een werkgever van een sollicitant online bekijken?

Sam, de gesprekspartner, heeft zelf geen mening en wil begrijpen waar de student de grens legt.

## Wat de student doet

1. **Je grens.** De student zet een streep in een ladder van vijf situaties. Wat boven de streep staat mag de werkgever bekijken, wat eronder staat niet.
2. **Het verschil.** Sam toont de twee situaties rond de streep en vraagt wat het verschil is. De student kiest een kenmerk en legt het daarna in eigen woorden uit.
3. **Testen.** Sam legt nieuwe situaties voor die de regel op de proef stellen. Botst de regel met het oordeel van de student, dan scherpt de student zijn regel aan.
4. **Jouw regel.** De student ziet alle versies van zijn regel, schrijft hem in eigen woorden op en vergelijkt hem met de regels van de toezichthouder.

## Hoe het werkt zonder chatbot

- Elke situatie is gecodeerd op een paar kenmerken: openbaar of besloten, werk of privé, recent of oud, gevoelig of niet, relevant voor het werk of niet, en open of stiekem.
- Buursituaties op de ladder verschillen in één of twee kenmerken. Zo weet de app altijd waar het verschil zit.
- De app oordeelt niet over de mening van de student. Hij checkt alleen of de regel past bij wat de student eerder zelf vond.
- De eigen woorden van de student komen letterlijk terug.

## Webinarlaag

Voor presentaties is er een aparte laag die studenten niet zien. Open die met `?webinar` achter de URL of met de toets **W**.

## Techniek

Statische site zonder build-stap: `index.html`, `styles.css` en `app.js`. Er wordt niets opgeslagen.
