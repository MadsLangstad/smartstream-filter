export const permissionsInfo = {
  storage: {
    icon: '💾',
    title: 'Local Storage',
    description: 'Saves your filter preferences on your device',
    why: 'So your settings persist between sessions'
  },
  activeTab: {
    icon: '📑',
    title: 'Active Tab',
    description: 'Interacts with the current tab when you click the extension',
    why: 'To apply filters to the page you\'re viewing'
  },
  hostPermissions: {
    icon: '🌐',
    title: 'Website Access',
    platforms: [
      { name: 'YouTube', domain: 'youtube.com', status: 'active' },
      { name: 'Spotify', domain: 'spotify.com', status: 'coming soon' },
      { name: 'Netflix', domain: 'netflix.com', status: 'planned' }
    ],
    description: 'Access to supported platforms',
    why: 'To inject filtering functionality into these sites'
  }
};

export const faqs = [
  {
    question: 'Where is my data stored?',
    answer: 'All data is stored locally on your device. We don\'t have servers and never transmit your data.'
  },
  {
    question: 'How do I reset my settings?',
    answer: 'Click the extension icon and adjust the sliders to your preferred values, or uninstall and reinstall the extension for a complete reset.'
  },
  {
    question: 'Why does it need website permissions?',
    answer: 'To inject the filtering controls into supported websites. We only access sites you visit, not your browsing history.'
  },
  {
    question: 'Is my viewing history tracked?',
    answer: 'No. SmartStream Filter only filters content based on duration. We don\'t track what you watch or browse.'
  },
  {
    question: 'Will it work on other platforms?',
    answer: 'Currently supports YouTube. Spotify, Netflix, and other platforms are coming soon!'
  }
];