import { defineComponent } from "vue";
// 使用 ?inline 将 CSS 作为字符串导入，用于 Vue Custom Element
import styles from '../../../lib/global.css?inline';

export default defineComponent({
  name: "App",
  styles: [styles],
  setup() {
    return () => <div id="video-roll-extension" class="flex justify-center items-center bg-red">123</div>
  },
});