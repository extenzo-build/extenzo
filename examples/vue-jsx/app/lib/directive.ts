// src/directives/permission.ts
import { DirectiveBinding, ObjectDirective } from "vue";
import { showDialog } from "vant";
import { createURL } from "app/util";

// 权限指令的类型定义
interface PermissionDirectiveBinding
  extends Omit<DirectiveBinding, "modifiers"> {
  value: string | string[]; // 需要的权限码
  modifiers: {
    disable?: boolean; // 是否禁用元素而不仅是阻止点击
  };
}

// 权限检查函数 (实际项目中可以从 store 或 API 获取)
export const checkPermission = (requiredPermission: string | string[]): boolean => {
  // 这里模拟权限检查，实际项目中应该从 store 或全局状态获取
  const userPermissions = ["authenticated", "pro"]; // 模拟当前用户权限

  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some((perm) => userPermissions.includes(perm));
  }
  return userPermissions.includes(requiredPermission);
};

// 权限指令实现
export const vPermission: ObjectDirective<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: PermissionDirectiveBinding) {
    // 始终绑定点击事件，在事件中校验权限
    const clickHandler = (e: Event) => {
      const hasPermission = checkPermission(binding.value);
      if (!hasPermission) {
        if (binding.modifiers.disable) {
          el.style.opacity = "0.5";
          el.style.pointerEvents = "none";
        } else {
          stopEvent(e);
        }
      }
    };

    if ((el as any)._vPermissionClickHandler) {
      el.removeEventListener(
        "click",
        (el as any)._vPermissionClickHandler,
        true
      );
    }

    // 保存 handler 以便卸载时移除
    (el as any)._vPermissionClickHandler = clickHandler;
    el.addEventListener("click", clickHandler, true);
  },
  updated(el: HTMLElement, binding: PermissionDirectiveBinding) {
    // 始终绑定点击事件，在事件中校验权限
    const clickHandler = (e: Event) => {
      const hasPermission = checkPermission(binding.value);
      if (!hasPermission) {
        if (binding.modifiers.disable) {
          el.style.opacity = "0.5";
          el.style.pointerEvents = "none";
        } else {
          stopEvent(e);
        }
      }
    };

    if ((el as any)._vPermissionClickHandler) {
      el.removeEventListener(
        "click",
        (el as any)._vPermissionClickHandler,
        true
      );
    }

    // 保存 handler 以便卸载时移除
    (el as any)._vPermissionClickHandler = clickHandler;
    el.addEventListener("click", clickHandler, true);
  },
  beforeUnmount(el: HTMLElement) {
    // 移除事件监听
    const handler = (el as any)._vPermissionClickHandler;
    if (handler) {
      el.removeEventListener("click", handler, true);
      delete (el as any)._vPermissionClickHandler;
    }
  },
};

// 阻止事件冒泡和默认行为
function stopEvent(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  // 可以在这里添加全局权限提示
  console.warn("您没有执行此操作的权限");
  showDialog({
    title: "Sign in to unlock",
    message: "Sign in to unlock this function for free",
    theme: "round-button",
    confirmButtonText: "Sign in",
    confirmButtonColor: "#7367F0",
    closeOnClickOverlay: true,
  }).then(() => {
    createURL(`https://videoroll.app/${chrome.i18n.getUILanguage().includes('zh') ? 'zh' : 'en'}/signin`);
    // on close
  });
}
