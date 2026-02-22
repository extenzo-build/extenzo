/*
 * @Author: gomi gxy880520@qq.com
 * @Date: 2025-06-17 19:26:09
 * @LastEditors: gomi gxy880520@qq.com
 * @LastEditTime: 2025-06-17 22:37:07
 * @FilePath: \website-nextc:\programs\VideoRoll-Pro\src\options\components\Panel\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineComponent, h } from "vue";

import "./index.less";

export default defineComponent({
  name: "Panel",
  setup(props: Record<string, any>, { slots }: { slots: any }) {
    return () => <div class="options-panel w-2xl">{slots.content?.()}</div>;
  },
});
