export class PermissionManager {
  static async checkHostPermission(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const origin = `${urlObj.protocol}//${urlObj.host}`;
      
      return await chrome.permissions.contains({
        origins: [origin]
      });
    } catch (error) {
      console.error('Error checking host permission:', error);
      return false;
    }
  }

  static async requestHostPermission(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const origin = `${urlObj.protocol}//${urlObj.host}`;
      
      return await chrome.permissions.request({
        origins: [origin]
      });
    } catch (error) {
      console.error('Error requesting host permission:', error);
      return false;
    }
  }

  static async checkAllRequiredPermissions(): Promise<boolean> {
    try {
      const required = await chrome.permissions.contains({
        permissions: ['tabs', 'activeTab', 'webRequest', 'storage', 'scripting'],
        origins: ['http://*/*', 'https://*/*']
      });
      
      return required;
    } catch (error) {
      console.error('Error checking required permissions:', error);
      return false;
    }
  }

  static async requestAllPermissions(): Promise<boolean> {
    try {
      const granted = await chrome.permissions.request({
        permissions: ['tabs', 'activeTab', 'webRequest', 'storage', 'scripting'],
        origins: ['http://*/*', 'https://*/*']
      });
      
      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }
}