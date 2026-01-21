# Academic Wheel of Privilege - Interactive Visualisation

An interactive 3D visualisation exploring how 20 identity characteristics across 7 categories affect experiences of privilege in academic settings.

**[Try it live →](https://sjmf.github.io/academic-wheel-of-privilege/)**

![Academic Wheel of Privilege](https://img.shields.io/badge/Three.js-r128-blue) ![License](https://img.shields.io/badge/license-CC--BY--NC--4.0-green)

## About

This tool is based on the **Academic Wheel of Privilege** developed by Elsherif et al. (2022), adapted from Sylvia Duckworth's original Wheel of Privilege. It aims to promote reflection on intersectionality and encourage more inclusive practices in research and education.

### Features

- **Interactive 3D wheel** built with Three.js
- **20 identity characteristics** across 7 categories
- **Drag bubbles** between three privilege rings (inner/middle/outer)
- **Privilege score calculation** (20-60 points)
- **UK legal protection status** for each characteristic
- **Responsive design** for desktop and mobile
- **Shareable URLs** that preserve your selections
- **Local storage** persistence

### The Rings

| Ring | Points | Meaning |
|------|--------|---------|
| Inner | 3 | Most privileged position |
| Middle | 2 | Intermediate position |
| Outer | 1 | Least privileged position |

## Usage

### Desktop
- **Click** a bubble to view details and legal protection status
- **Drag** bubbles between rings to set your position
- **Scroll** to zoom in/out
- **Click and drag** the background to rotate the wheel

### Mobile
- **Tap** a bubble for details
- **Drag** bubbles between rings
- **Pinch** to zoom
- **Swipe** the background to rotate
- **Swipe left/right** on the info panel to navigate between characteristics

## Installation

This is a single static HTML file with no build process required. Simply:

1. Clone or download the repository
2. Open `index.html` in a web browser

```bash
git clone https://github.com/sjmf/academic-wheel-of-privilege.git
cd academic-wheel-of-privilege
open index.html
```

## References

- [FORRT Academic Wheel of Privilege Project](https://forrt.org/awop/)
- [Video Explainer (YouTube)](https://www.youtube.com/watch?v=mzEdTyA06cU)
- Elsherif, M. M., et al. (2022). Bridging Neurodiversity and Open Scholarship. [https://doi.org/10.31222/osf.io/k7a9p](https://doi.org/10.31222/osf.io/k7a9p)
- [UKRIO Academic Wheel of Privilege Resource](https://ukrio.org/ukrio-resources/equality-diversity-and-inclusion/academic-wheel-of-privilege/)

## Categories

1. **Living and Culture** - Skin colour, religion, citizenship, language
2. **Caregiving** - Caring duties
3. **Education and Career** - Caregiver education, formal education, funding, career stage, institution type
4. **Gender and Sexuality** - Gender identity, sexual orientation
5. **Socioeconomic** - Current wealth, housing
6. **Health and Wellbeing** - Neurodiversity, mental health, disability, body size
7. **Childhood and Development** - Childhood household wealth, childhood stability

## Technologies

- [Three.js](https://threejs.org/) r128 - 3D graphics library
- Vanilla JavaScript (ES6+)
- CSS3 with custom properties

## License

This work is licensed under a [Creative Commons Attribution 4.0 International License (CC-BY-NC-4.0)](https://creativecommons.org/licenses/by-nc/4.0/), following the License statement on the [FORRT AWOP project page](https://forrt.shinyapps.io/awop/)

You are free to share and adapt this work, noncommercially, provided you give appropriate credit.

## Credits

Visualisation by [@sjmf](https://github.com/sjmf) at [finnigan.dev](https://finnigan.dev/)
