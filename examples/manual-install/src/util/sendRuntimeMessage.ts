import browser from "@extenzo/utils/webextension-polyfill";

/**
 * send runtime message
 * @param tabId 
 * @param options 
 * @param callback 
 */
export function sendRuntimeMessage(tabId: number, options: any, callback?: Function) {
    return browser.runtime.sendMessage({ tabId, ...options }).then((response) => {
        if (browser.runtime.lastError) {
            console.debug(browser.runtime.lastError.message);
        }

        if (typeof callback === 'function') {
            callback(response);
        }

        return response;
    }).catch((err) => {
        console.debug(err);
        return err;
    });
}