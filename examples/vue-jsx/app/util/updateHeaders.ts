export function updateHeaderRules(data: any, tabId: any, url: string) {
  return chrome.declarativeNetRequest
    .updateSessionRules({
      removeRuleIds: [1],
    })
    .then(() => {
      const rules = { removeRuleIds: [1], addRules: [] };

      if (Object.keys(data).length) {
        // const match = url.match(/^https?:\/\/([^/]+)/);
        // let urlFilter = "";
        // if (match) {
        //   const domain = match[1]; // cn-hbyc-ct-01-02.bilivideo.com
        //   urlFilter = `||${domain}/*`;
        // }
        rules.addRules = [
          {
            id: 1,
            priority: 1,
            action: {
              type: "modifyHeaders",
              requestHeaders: Object.keys(data).map((key) => ({
                header: key,
                operation: "set",
                value: data[key],
              })),
            },
            condition: {
              resourceTypes: ["xmlhttprequest", "media"],
              initiatorDomains: [chrome.runtime.id]
            //   tabIds: [1],
            //   urlFilter: urlFilter || url,
            },
          } as never,
        ];
      }
      return chrome.declarativeNetRequest.updateSessionRules(rules);
    });
}
