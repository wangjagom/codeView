import { describe, expect, it } from 'vitest';
import { highlight, highlightWithMark } from './highlight';
describe('highlight', () => {
    it('escapes HTML in code', () => {
        const html = highlight('<img src=x onerror="alert(1)">');
        expect(html).not.toContain('<img');
        expect(html).toContain('&lt;');
    });
    it('marks the matched part', () => {
        expect(highlightWithMark('  var x = 1;', 'var', 'w')).toContain('<span class="sq-w"><span class="k">var</span></span>');
    });
    it('treats # as a comment only in Python', () => {
        expect(highlight('# hi', 'Python')).toContain('class="c"');
        expect(highlight('color: #fff;', 'CSS')).not.toContain('class="c"');
    });
});
