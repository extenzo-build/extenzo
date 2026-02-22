/*
 * @description: Help
 * @Author: Gouxinyu
 * @Date: 2022-09-19 22:53:23
 */

import { defineComponent } from "vue";
import { Help } from "@vicons/tabler";

export default defineComponent({
  name: "Help",
  props: {
    message: {
      type: String,
      default: "Help message not provided",
    },
  },
  setup(props: { message: string }) {
    return () => (
      <span class="help flex items-center ml-2" v-tooltip={props.message}>
        <Help class="w-[15px] h-[15px]"></Help>
      </span>
    );
  },
});
