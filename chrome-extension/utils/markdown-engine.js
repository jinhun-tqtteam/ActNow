/**
 * ActNow Markdown & Syntax Highlight Engine
 * A lightweight, dependency-free Markdown parser and syntax highlighter optimized for Chrome Extensions.
 */

class MarkdownEngine {
    constructor() {
        this.rules = [
            // Headers
            { regex: /^#{6}\s?([^\n]+)/gm, replacement: '<h6>$1</h6>' },
            { regex: /^#{5}\s?([^\n]+)/gm, replacement: '<h5>$1</h5>' },
            { regex: /^#{4}\s?([^\n]+)/gm, replacement: '<h4>$1</h4>' },
            { regex: /^#{3}\s?([^\n]+)/gm, replacement: '<h3>$1</h3>' },
            { regex: /^#{2}\s?([^\n]+)/gm, replacement: '<h2>$1</h2>' },
            { regex: /^#{1}\s?([^\n]+)/gm, replacement: '<h1>$1</h1>' },

            // Bold & Italic
            { regex: /\*\*\*([^*]+)\*\*\*/g, replacement: '<strong><em>$1</em></strong>' },
            { regex: /\*\*([^*]+)\*\*/g, replacement: '<strong>$1</strong>' },
            { regex: /\*([^*]+)\*/g, replacement: '<em>$1</em>' },
            { regex: /__([^_]+)__/g, replacement: '<strong>$1</strong>' },
            { regex: /_([^_]+)_/g, replacement: '<em>$1</em>' },

            // Lists (Unordered) - Simple support
            { regex: /^\s*[\-\*]\s+(.+)/gm, replacement: '<li>$1</li>' },
            { regex: /(<li>.*<\/li>)/s, replacement: '<ul>$1</ul>' }, // Wrap consecutive lis (simplified)

            // Links
            { regex: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>' },

            // Inline Code
            { regex: /`([^`]+)`/g, replacement: '<code class="inline-code">$1</code>' },
        ];
    }

    /**
     * Main parse function
     */
    parse(text) {
        if (!text) return '';

        // 1. Escape HTML (Basic XSS prevention)
        let html = this.escapeHtml(text);

        // 2. Extract Code Blocks first (to prevent processing markdown inside them)
        const codeBlocks = [];
        // Use a unique placeholder that doesn't trigger markdown rules (no underscores/asterisks)
        html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const placeholder = `{{ACTNOWCODEBLOCK${codeBlocks.length}}}`;
            codeBlocks.push({ lang: lang.trim(), code: this.decodeHtml(code) }); // Decode back for highlighting
            return placeholder;
        });

        // 3. Apply Markdown Rules
        this.rules.forEach(rule => {
            html = html.replace(rule.regex, rule.replacement);
        });

        // 4. Paragraphs (Simple split by double newline)
        // Only apply p tags if not already a header or list
        html = html.split('\n\n').map(p => {
            if (p.trim().startsWith('<h') || p.trim().startsWith('<ul>') || p.trim().startsWith('<li>') || p.includes('{{ACTNOWCODEBLOCK')) {
                return p;
            }
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        }).join('\n');

        // 5. Restore Code Blocks with Syntax Highlighting
        html = html.replace(/{{ACTNOWCODEBLOCK(\d+)}}/g, (match, index) => {
            const block = codeBlocks[index];
            const highlighted = this.highlight(block.code, block.lang);
            return `
                <div class="actnow-code-block">
                    <div class="actnow-code-header">
                        <span class="actnow-code-lang">${block.lang || 'text'}</span>
                        <button class="actnow-copy-btn" data-code="${this.escapeHtml(block.code)}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .895 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z"></path>
                            </svg>
                            Copy
                        </button>
                    </div>
                    <pre><code class="actnow-hljs ${block.lang}">${highlighted}</code></pre>
                </div>
            `;
        });

        // 6. Cleanup Lists (Regex approach above is imperfect for groups, fix ul wrapping)
        // Note: A robust list parser requires a state machine, this is a visual approximation
        html = html.replace(/<\/ul>\s*<ul>/g, ''); 

        return html;
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    decodeHtml(text) {
        return text
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, "\"")
            .replace(/&#039;/g, "'");
    }

    /**
     * Simple Syntax Highlighter
     */
    highlight(code, lang) {
        let highlighted = this.escapeHtml(code);

        // Common Keywords (JS, Python, Java-like)
        const keywords = /\b(const|let|var|if|else|for|while|return|function|class|import|from|export|async|await|try|catch|def|print|True|False|None|null|undefined|this|new|typeof|void)\b/g;
        
        // Strings
        const strings = /(".*?"|'.*?'|`.*?`)/g;
        
        // Comments
        const comments = /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm;
        
        // Numbers
        const numbers = /\b(\d+)\b/g;

        // Apply highlighting (Order matters: Comments -> Strings -> Keywords -> Numbers)
        // We use temporary placeholders to avoid re-replacing inside HTML tags
        
        // 1. Strings
        highlighted = highlighted.replace(strings, '<span class="hljs-string">$1</span>');
        
        // 2. Keywords
        highlighted = highlighted.replace(keywords, '<span class="hljs-keyword">$1</span>');
        
        // 3. Numbers
        highlighted = highlighted.replace(numbers, '<span class="hljs-number">$1</span>');
        
        // 4. Comments (Last to override others inside comments)
        // Note: This regex-based approach is fragile for mixed content, but sufficient for basic display
        highlighted = highlighted.replace(comments, '<span class="hljs-comment">$1</span>');

        return highlighted;
    }

    /**
     * Token Estimator (Approximate)
     * Rule of thumb: 1 token ~= 4 chars in English
     */
    estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }
}

// Export instance
window.ActNowMarkdown = new MarkdownEngine();
