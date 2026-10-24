import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { RichText, langFromTag } from './RichText';

const html = (text: string, lang = 'JavaScript') => renderToStaticMarkup(createElement(RichText, { text, lang }));

describe('RichText', () => {
  it('colors inline code with the post language', () => {
    const out = html('`const a = 1` 처럼 써요', 'JavaScript');
    expect(out).toContain('class="ic-code dm"');
    expect(out).toContain('<span class="k">const</span>');
  });

  it('renders fenced blocks with their own language', () => {
    const out = html('이렇게요\n```abap\nSELECT * FROM mara.\n```\n끝', 'JavaScript');
    expect(out).toContain('class="cm-block dm"');
    expect(out).toContain('ABAP');
    expect(out).toContain('<span class="k">SELECT</span>');
    expect(out).toContain('끝');
  });

  it('escapes HTML everywhere', () => {
    const out = html('<img src=x onerror=alert(1)> `<b>x</b>`\n```\n<script>alert(1)</script>\n```');
    expect(out).not.toMatch(/<img|<script|<b>/);
  });

  it('maps fence tags', () => {
    expect(langFromTag('abap', 'JavaScript')).toBe('ABAP');
    expect(langFromTag('sql', 'ABAP')).toBe('SQLScript');
    expect(langFromTag('xml', 'ABAP')).toBe('XML');
    expect(langFromTag('', 'CDS')).toBe('CDS');
    expect(langFromTag('kotlin', 'ABAP')).toBe('ABAP');
  });
});

describe('RichText layout', () => {
  it('drops the blank lines around blocks and dedents code', () => {
    const out = html('앞\n```js\n    return x;\n```\n뒤');
    expect(out).toContain('<span class="cm-inline"><span>앞</span></span>');
    expect(out).toContain('<span class="kc">return</span> <span class="v">x</span>;');
    expect(out).not.toContain('    <span class="kc">return');
    expect(out).toContain('<span class="cm-inline"><span>뒤</span></span>');
  });
});
