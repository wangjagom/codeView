import { describe, expect, it } from 'vitest';
import { searchPosts } from './search';
const post = (id, patch) => ({
    id, team_id: 't', author_id: 'u1', title: '', file_name: 'a.abap', lang: 'ABAP', task: '자유 질문', ask: '', code: 'x', version: 1, status: 'wait', reviewer_ids: [], created_at: '', updated_at: '', ...patch,
});
describe('searchPosts', () => {
    const posts = [
        post('p1', { title: '판매 리포트', code: "REPORT z.\nSELECT * FROM vbak INTO TABLE @DATA(lt).\nREAD TABLE lt INTO DATA(ls) INDEX 1." }),
        post('p2', { title: 'UI5 세트', files: [{ name: 'manifest.json', lang: 'JSON', code: '{}' }, { name: 'Main.controller.js', lang: 'JavaScript', code: 'var o = new sap.m.Table();' }] }),
        post('p3', { title: '질문', ask: 'catch에서 오류가 안 잡혀요', author_id: 'u2' }),
    ];
    const name = (id) => (id === 'u2' ? '지은' : '준호');
    it('코드 내용으로 찾고 줄을 알려 줘요', () => {
        expect(searchPosts(posts, 'read table', name).get('p1')).toMatchObject({ where: 'code', line: 3 });
        expect(searchPosts(posts, 'sap.m.Table', name).get('p2')).toMatchObject({ where: 'code', file: 'Main.controller.js', line: 1 });
    });
    it('여러 낱말은 모두 들어 있어야 해요', () => {
        expect([...searchPosts(posts, '판매 vbak', name).keys()]).toEqual(['p1']);
        expect(searchPosts(posts, '판매 sap.m', name).size).toBe(0);
    });
    it('설명·글쓴이·파일 이름으로도 찾아요', () => {
        expect(searchPosts(posts, 'catch', name).get('p3')?.where).toBe('ask');
        expect([...searchPosts(posts, '지은', name).keys()]).toEqual(['p3']);
        expect(searchPosts(posts, 'manifest', name).get('p2')?.where).toBe('file');
    });
});
