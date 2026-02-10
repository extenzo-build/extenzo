const SPECIAL_WEBSITE: { [key: string]: Function } = {
    // 'pornhub.com': (baseUrl: string, playlistUri: string, manifest: any): string => {
    //     return baseUrl.replace(/(\/[^/]+\.mp4\/).*$/, `$1${playlistUri}`);
    // }
    'instagram.com': (baseUrl: string, playlistUri?: string, manifest?: any): string => {
        return replaceUrlParams(baseUrl, { bytestart: null, byteend: null});
    }
};

/**
 * 替换或添加URL中的查询参数
 * @param {string} url - 需要处理的URL
 * @param {Object} params - 包含参数名和值的对象
 * @returns {string} - 替换参数后的URL
 */
const replaceUrlParams = (url: string, params = {}) => {
    // 创建URL对象以便操作
    const urlObj = new URL(url);
    
    // 获取URL的搜索参数对象
    const searchParams = urlObj.searchParams;
    
    // 遍历参数对象，替换或添加参数
    Object.entries(params).forEach(([key, value]) => {
        // 如果值为null或undefined，则删除该参数
        if (value === null || value === undefined) {
            searchParams.delete(key);
        } else {
            // 否则设置参数值（会自动替换已存在的参数）
            searchParams.set(key, value);
        }
    });
    
    // 返回更新后的URL
    return urlObj.toString();
};

export type Options = {
    url: string;
    baseUrl: string;
    playlistUri?: string;
    manifest?: any;
    next?: Function;
}

export function handleSpecialWebsite(options: Options) {
    const { url, baseUrl, playlistUri, manifest, next } = options;

    if (!url) return;

    const site = Object.keys(SPECIAL_WEBSITE).find(key => url.includes(key)) ?? '';
    const handler = SPECIAL_WEBSITE[site];

    if (typeof handler === 'function' && typeof next === 'function') {
        next(handler(baseUrl, playlistUri, manifest));
        return;
    }

    if (typeof handler === 'function') {
        return handler(baseUrl, playlistUri, manifest);
    }

    return baseUrl;
}