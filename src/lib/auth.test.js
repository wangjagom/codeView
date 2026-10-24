import { describe, expect, it, vi } from 'vitest';
vi.mock('./supabase', () => ({ supabase: {} }));
const { nameProblem, nameToEmail } = await import('./auth');
describe('name login', () => {
    it('validates names', () => {
        expect(nameProblem('준호')).toBeNull();
        expect(nameProblem('dev_kim.7')).toBeNull();
        expect(nameProblem('a')).toContain('2~20');
        expect(nameProblem('김 준호')).toContain('띄어쓰기');
        expect(nameProblem('준호!')).toContain('한글, 영문');
    });
    it('maps a name to a stable, case-insensitive ASCII email', async () => {
        const a = await nameToEmail('Junho');
        expect(a).toBe(await nameToEmail('  junho '));
        expect(a).toMatch(/^u[0-9a-f]{32}@users\.codeview\.example\.com$/);
        expect(await nameToEmail('준호')).not.toBe(a);
    });
});
