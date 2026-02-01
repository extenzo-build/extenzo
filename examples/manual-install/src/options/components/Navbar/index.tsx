import { getUserSecure } from "src/background/secureUser";
import { checkPermission, vPermission } from "src/lib/directive";
import { defineComponent, onMounted, ref } from "vue";
import { OPTIONS_MENU } from "../../config";

import "./index.less";

export default defineComponent({
  name: "Navbar",
  props: {
    active: Number,
    onChange: Function,
  },
  directives: {
    permission: vPermission,
  },
  setup(props) {
    const user = ref();
    const onChange = (item: any, index: number) => {
      props.onChange?.(item, index);
    };

    onMounted(async () => {
      try {
        const secureUser = await getUserSecure();
        user.value = secureUser;
      } catch (error) {
        console.error("Failed to get secure user:", error);
      }
    });
    return () => (
      <nav class="options-nav">
        <ul>
          {OPTIONS_MENU.map((item, index) => {
            return item.auth ? (
              <li
                class={`options-nav-item ${
                  index === props.active ? "active-item" : ""
                }`}
                v-permission={[user.value?.role]}
                onClick={() => onChange(item, index)}
              >
                <span class="nav-title-wrapper">
                  {item.title}
                  {checkPermission([user.value?.role]) ? null : (
                    <span class="pro-badge">Pro</span>
                  )}
                </span>
              </li>
            ) : (
              <li
                class={`options-nav-item ${
                  index === props.active ? "active-item" : ""
                }`}
                onClick={() => onChange(item, index)}
              >
                {item.title}
              </li>
            );
          })}
        </ul>
      </nav>
    );
  },
});
