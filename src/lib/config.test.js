import { describe, expect, it } from 'vitest';
import { normalizeSupabaseUrl } from './config';
describe('normalizeSupabaseUrl', () => {
    it('keeps only the origin', () => {
        expect(normalizeSupabaseUrl('https://abc.supabase.co/rest/v1/')).toBe('https://abc.supabase.co');
        expect(normalizeSupabaseUrl(' https://abc.supabase.co/ ')).toBe('https://abc.supabase.co');
        expect(normalizeSupabaseUrl('"https://abc.supabase.co"')).toBe('https://abc.supabase.co');
        expect(normalizeSupabaseUrl('abc.supabase.co')).toBe('https://abc.supabase.co');
        expect(normalizeSupabaseUrl('')).toBe('');
    });
});
