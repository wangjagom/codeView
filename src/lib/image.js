/** 고른 사진을 가운데 정사각형으로 잘라 작은 JPEG(data URL)로 만들어요. */
export async function toAvatar(file, size = 160) {
    if (!file.type.startsWith('image/'))
        throw new Error('이미지 파일만 올릴 수 있어요');
    if (file.size > 20 * 1024 * 1024)
        throw new Error('20MB 이하 이미지만 올릴 수 있어요');
    const img = await load(file);
    const w = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const h = 'naturalHeight' in img ? img.naturalHeight : img.height;
    const s = Math.min(w, h);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('이 브라우저에서는 사진을 줄일 수 없어요');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
}
async function load(file) {
    if ('createImageBitmap' in window) {
        try {
            return await createImageBitmap(file);
        }
        catch { /* 아래 방법으로 다시 해 봐요 */ }
    }
    const url = URL.createObjectURL(file);
    try {
        return await new Promise((ok, fail) => {
            const img = new Image();
            img.onload = () => ok(img);
            img.onerror = () => fail(new Error('사진을 읽지 못했어요. 다른 파일을 골라 주세요'));
            img.src = url;
        });
    }
    finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }
}
