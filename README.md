# SmartStream Filter

A browser extension that filters streaming content by duration, currently supporting YouTube with plans for Spotify, Netflix, and more.

## 🚀 Features

- **Duration Filtering**: Filter YouTube videos by minimum and maximum duration
- **Real-time Sync**: Instant filtering as you browse
- **Seamless Integration**: Sliders integrated directly into YouTube's header
- **Dark Mode**: Matches YouTube's theme perfectly
- **Premium Features**: Advanced filters, analytics, and multi-platform support (coming soon)

## 📁 Project Structure

```
smartstream-filter/
├── src/                          # Source code
│   ├── background/              # Background service worker
│   │   └── index.ts            # Extension background logic
│   ├── content/                 # Content scripts
│   │   └── youtube-header.ts   # YouTube integration
│   ├── popup/                   # Extension popup
│   │   └── index.ts            # Popup controller
│   ├── services/                # Shared services
│   │   └── feature-manager.ts  # Feature flag management
│   ├── types/                   # TypeScript types
│   │   └── index.ts            # Shared type definitions
│   ├── onboarding.html         # First-time user experience
│   └── onboarding.js           # Onboarding logic
├── packages/                    # Modular architecture
│   ├── core/                   # MIT licensed core logic
│   │   ├── duration-filter.ts # Core filtering algorithms
│   │   └── package.json
│   ├── ui-components/          # MIT licensed UI components
│   │   ├── slider-component.ts # Reusable slider component
│   │   └── package.json
│   └── premium/                # Proprietary premium features
│       ├── feature-flags.ts    # Premium feature definitions
│       └── package.json
├── dist/                       # Built extension (git-ignored)
├── icons/                      # Extension icons
│   └── ssf.png                # SmartStream Filter icon
├── popup.html                  # Extension popup UI
├── manifest.json              # Chrome extension manifest
├── build.sh                   # Build script
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── LICENSE-MIT               # MIT license for open source parts
├── LICENSE-PROPRIETARY       # Proprietary license
├── PRIVACY_POLICY.md         # Privacy policy
├── TERMS_OF_USE.md          # Terms of use
└── dsa-possibilities.md      # DSA compliance strategy

```

## 🛠️ Installation

### For Users
1. Download the latest release from [Releases](https://github.com/yourusername/smartstream-filter/releases)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

### For Developers
```bash
# Clone the repository
git clone https://github.com/yourusername/smartstream-filter.git
cd smartstream-filter

# Install dependencies
npm install

# Build the extension
./build.sh

# Load the extension from the dist/ folder in Chrome
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Chrome browser

### Build Commands
```bash
# Development build with source maps
npm run dev

# Production build
npm run build

# Type checking
npx tsc --noEmit

# Build and package
./build.sh
```

### Project Architecture

The extension follows a modular architecture with clear separation between:

1. **Content Scripts** - Injected into web pages (YouTube)
2. **Background Service** - Handles extension lifecycle and storage
3. **Popup UI** - User interface for settings
4. **Feature Manager** - Controls premium features and licensing

## 📜 License

This project uses a **dual licensing** approach:

### Open Source Components (MIT License)
The following components are available under the MIT License:
- Core slider UI components (`packages/core/*`)
- Basic duration filtering logic (`packages/ui-components/*`)
- YouTube DOM integration patterns

See [LICENSE-MIT](LICENSE-MIT) for details.

### Proprietary Components
The following components are proprietary and not available for redistribution:
- Advanced filtering algorithms
- Multi-platform adapters (upcoming)
- Premium features
- Analytics and telemetry
- Server-side components

See [LICENSE-PROPRIETARY](LICENSE-PROPRIETARY) for details.

## 🔐 Privacy & Security

- **No data collection**: The extension works entirely locally
- **No external requests**: All filtering happens in your browser
- **Open source core**: Inspect the code yourself
- See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details

## 🚦 Roadmap

### Phase 1: YouTube (✅ Complete)
- [x] Basic duration filtering
- [x] Header integration
- [x] Real-time sync
- [x] Dark mode support

### Phase 2: Premium Features (🚧 In Progress)
- [ ] Advanced filters (keywords, channels)
- [ ] Custom presets
- [ ] Usage analytics
- [ ] Export/import settings

### Phase 3: Multi-Platform (📅 Planned)
- [ ] Spotify podcast filtering
- [ ] Netflix duration filtering
- [ ] Prime Video support
- [ ] Disney+ support

### Phase 4: Enterprise & DSA Compliance
- [ ] B2B licensing for platforms
- [ ] DSA Article 27 compliance tools
- [ ] White-label solutions

## 🤝 Contributing

Contributions to the open source components are welcome! Please ensure any contributions to the MIT-licensed portions can be distributed under the MIT license.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/smartstream-filter/issues)
- **Email**: support@smartstreamfilter.com
- **Documentation**: [Wiki](https://github.com/yourusername/smartstream-filter/wiki)

## 🏆 Acknowledgments

- Thanks to all contributors
- Inspired by the need for better content control
- Built with TypeScript, Vite, and Chrome Extensions API

---

**SmartStream Filter** - Take control of your streaming experience 🎯