
const calloutExtension = {
    name: 'callout',
    level: 'block',
    start(src) {
        return src.match(/^> \[!/i)?.index;
    },
    tokenizer(src, tokens) {
        // Matches > [!type] (+/-) Title followed by any number of lines starting with >
        const rule = /^> \[!([a-zA-Z]+)\]([\+\-]?) ?([^\n]*)\n?((?:(?=>)>[^\n]*\n?)*)/;
        const match = rule.exec(src);

        if (match) {
            const type = match[1].toLowerCase();
            const collapse = match[2]; 
            const title = match[3].trim();

            const bodyLines = match[4]
                .split('\n')
                .map(line => line.replace(/^> ?/, ''))
                .join('\n');

            const token = {
                type: 'callout',
                raw: match[0],
                calloutType: type,
                collapse: collapse,
                title: title,
                text: bodyLines,
                tokens: [],
                titleTokens: [] // New: for parsing title markdown
            };

            this.lexer.inlineTokens(token.title, token.titleTokens);
            this.lexer.blockTokens(token.text, token.tokens);
            return token;
        }
    },
    renderer(token) {
        const content = this.parser.parse(token.tokens);
        const titleContent = token.title ? this.parser.parseInline(token.titleTokens) : token.calloutType.charAt(0).toUpperCase() + token.calloutType.slice(1);
        const typeClass = `callout-${token.calloutType}`;

        if (token.collapse) {
            const open = token.collapse === '+' ? ' open' : '';
            return `
                <details class="callout ${typeClass} is-collapsible"${open}>
                    <summary class="callout-title">${titleContent}</summary>
                    <div class="callout-content">${content}</div>
                </details>
            `;
        }
        
        return `
            <div class="callout ${typeClass}">
                <div class="callout-title">${titleContent}</div>
                <div class="callout-content">${content}</div>
            </div>
        `;
    }
};

const highlightExtension = {
    name: 'highlight',
    level: 'inline',
    start(src) { return src.indexOf('=='); },
    tokenizer(src, tokens) {
        const rule = /^==([^=]+)==/;
        const match = rule.exec(src);
        if (match) {
            const token = {
                type: 'highlight',
                raw: match[0],
                text: match[1],
                tokens: []
            };
            this.lexer.inlineTokens(token.text, token.tokens);
            return token;
        }
    },
    renderer(token) {
        return `<mark>${this.parser.parseInline(token.tokens)}</mark>`;
    }
};

const inlineStyleExtension = {
    name: 'inlineStyle',
    level: 'inline',
    start(src) { return src.indexOf('['); },
    tokenizer(src, tokens) {
        const rule = /^\[([^\]]+)\]\{([^\}]+)\}/; // [text]{style}
        const match = rule.exec(src);
        if (match) {
            const token = {
                type: 'inlineStyle',
                raw: match[0],
                text: match[1],
                style: match[2],
                tokens: []
            };
            this.lexer.inlineTokens(token.text, token.tokens);
            return token;
        }
    },
    renderer(token) {
        return `<span style="${escapeHtml(token.style)}">${this.parser.parseInline(token.tokens)}</span>`;
    }
};

const inlineIconExtension = {
    name: 'inlineIcon',
    level: 'inline',
    start(src) { return src.indexOf(':'); },
    tokenizer(src, tokens) {
        const rule = /^:([a-z0-9-]+):/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: 'inlineIcon',
                raw: match[0],
                name: match[1]
            };
        }
    },
    renderer(token) {
        const name = token.name;
        // Logic for pathing correctly to UI vs Game Icons
        // We'll use a simple approach: if it's a known UI icon name, use ui-icons
        const uiIcons = ['warning-circle', 'info', 'check', 'x-circle', 'question', 'gear', 'article', 'book', 'link', 'tag', 'image', 'plus', 'minus', 'x'];
        const isUi = uiIcons.includes(name);
        const path = isUi ? `ui-icons/${name}.svg` : `icons/${name}.svg`;
        
        return `<span class="inline-icon-wrap"><span class="icon-container inline-icon" style="-webkit-mask-image: url('${path}'); mask-image: url('${path}');"></span></span>`;
    }
};

const containerExtension = {
    name: 'container',
    level: 'block',
    start(src) { return src.match(/^\{\{/)?.index; },
    tokenizer(src, tokens) {
        const rule = /^\{\{([^\n]*)\n([\s\S]*?)\n\}\}/;
        const match = rule.exec(src);
        if (match) {
            const attrStr = match[1].trim();
            const body = match[2];

            // Parse attributes
            const attrs = attrStr.split(',').map(s => s.trim()).filter(Boolean);
            let id = null;
            let classes = ['custom-container'];
            let styles = [];

            attrs.forEach(a => {
                if (a.startsWith('#')) id = a.substring(1);
                else if (a.includes(':')) styles.push(a);
                else classes.push(a);
            });

            const token = {
                type: 'container',
                raw: match[0],
                id: id,
                classes: classes.join(' '),
                style: styles.join('; '),
                text: body,
                tokens: []
            };
            this.lexer.blockTokens(token.text, token.tokens);
            return token;
        }
    },
    renderer(token) {
        const idAttr = token.id ? ` id="${escapeHtml(token.id)}"` : '';
        const classAttr = ` class="${escapeHtml(token.classes)}"`;
        const styleAttr = token.style ? ` style="${escapeHtml(token.style)}"` : '';

        return `<div${idAttr}${classAttr}${styleAttr}>
          ${this.parser.parse(token.tokens)}
        </div>`;
    }
};

const diceRollerExtension = {
    name: 'diceRoller',
    level: 'inline',
    start(src) { return src.indexOf('{{'); },
    tokenizer(src, tokens) {
        const rule = /^\{\{([^{}]+)\}\}/; // Matches {{3d6+2}}
        const match = rule.exec(src);
        if (match) {
            return {
                type: 'diceRoller',
                raw: match[0],
                notation: match[1].trim(),
            };
        }
    },
    renderer(token) {
        const safeNotation = escapeHtml(token.notation);
        return `<button class="dice-roll-link" data-notation="${safeNotation}" title="Roll ${safeNotation}">
            <span class="dice-icon">🎲</span>
            <span class="dice-notation">${safeNotation}</span>
        </button>`;
    }
};