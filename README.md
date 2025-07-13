# SmartStream Filter

Browser extension that filters content by duration on YouTube and other platforms (coming soon). Hide videos outside your preferred duration range to focus on content that matters to you.

## Features

- **Duration filtering**: Set min/max duration to show only videos you want
- **Real-time sync**: Changes apply instantly without page reload  
- **YouTube integration**: Sliders built into YouTube's header
- **Dark mode**: Matches YouTube's dark theme
- **Privacy focused**: All data stored locally, no tracking

## Installation

### From Source
1. Clone this repository
2. Run `npm install`
3. Run `./build.sh`
4. Open `chrome://extensions` in Chrome/Edge
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `dist` folder

### From Web Store
Coming soon to Chrome Web Store and other extension stores.

## Usage

1. Visit YouTube - sliders appear automatically in the header
2. Adjust min/max duration using the sliders
3. Toggle on/off with the switch
4. Or click the extension icon to access settings

Default range: 5-30 minutes (adjustable 0-10 hours)

## Development

### Setup
```bash
npm install
```

### Build
```bash
./build.sh
```

### Project Structure
```
src/
├── background/     # Service worker
├── content/        # YouTube integration
├── popup/          # Extension popup
└── types/          # TypeScript definitions
```

### Technologies
- TypeScript
- Vite (bundler)
- Chrome Extension Manifest V3

## Roadmap

- [x] YouTube support
- [ ] Spotify support
- [ ] Netflix support  
- [ ] Premium features
- [ ] Cross-browser support (Firefox, Safari)

## Privacy

SmartStream Filter stores all settings locally on your device. We don't collect any data, track usage, or connect to external servers. See our [Privacy Policy](PRIVACY_POLICY.md) for details.

## Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

## License

[Choose appropriate license]

---

Created with ❤️ for better content consumption