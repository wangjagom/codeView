export const ROLE_LABEL = { owner: '팀장', vice: '부팀장', member: '팀원' };
export const canManage = (role) => role === 'owner' || role === 'vice';
/** 글의 파일 목록 (예전 글은 파일 하나) */
export const filesOf = (p) => p.files?.length ? p.files : [{ name: p.file_name, lang: p.lang, code: p.code }];
/** 그 버전의 파일 목록 (예전 버전은 첫 파일 코드만 있어요) */
export const versionFiles = (v, p) => {
    if (v.files?.length)
        return v.files;
    const [first, ...rest] = filesOf(p);
    return [{ ...first, code: v.code }, ...rest];
};
export const isShare = (p) => p.kind === 'share';
export const STATUS_LABEL = {
    wait: '리뷰 대기',
    doing: '피드백 중',
    done: '해결됨',
};
