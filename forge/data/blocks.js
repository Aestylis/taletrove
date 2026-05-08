// data/blocks.js

const BLOCK_DEFINITIONS = {
    TextField: {
        name: 'Text Field',
        icon: 'text-align-left', // Placeholder for an icon name or SVG path
        defaultData: { content: '' }
    },
    Image: {
        name: 'Image',
        icon: 'image',
        defaultData: { src: null, caption: '', size: 100, float: 'none' }
    },
    YouTube: {
        name: 'YouTube',
        icon: 'youtube-logo',
        defaultData: { url: '', startTime: 0 }
    },
    Spotify: {
        name: 'Spotify',
        icon: 'spotify-logo',
        defaultData: { url: '' }
    },
    Tags: {
        name: 'Tags',
        icon: 'tag',
        defaultData: { tags: [] }
    },
    FeatureLink: {
        name: 'Link to Feature',
        icon: 'link',
        defaultData: {
            targetId: null
        }

    },
    Timeline: {
        name: 'Timeline',
        icon: 'calendar-blank',
        defaultData: {
            events: [{
                dateData: { year: 1, month: '', day: 1, era: '' },
                title: 'New Event',
                description: '',
                source: 'local', // 'local' or 'linked'
                linkedId: null   // ID of Encyclopedia Event
            }]
        }
    },
    Relationships: {
        name: 'Relationships',
        icon: 'link',
        defaultData: {
            links: [] // Array of { targetId, type, isBidirectional }
        }
    },
    Meter: {
        name: 'Meter',
        icon: 'activity',
        defaultData: { label: '', current: 0, max: 10 }
    },
    MapEmbed: {
        name: 'Map Embed',
        icon: 'map-trifold',
        defaultData: { mapId: null, zoom: null, lat: null, lng: null, height: 280, caption: '' }
    }
};

// Make it available to other scripts if needed (though we won't need this step immediately)
if (typeof window !== 'undefined') {
    window.BLOCK_DEFINITIONS = BLOCK_DEFINITIONS;
}
