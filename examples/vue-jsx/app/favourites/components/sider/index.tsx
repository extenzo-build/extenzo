import { defineComponent, PropType } from "vue";
import Badge from "primevue/badge";

export interface SiteGroup {
  key: string; // 一般为域名
  label: string; // 展示文本
  count: number; // 收藏数
  favicon?: string; // favicon 地址
}

export default defineComponent({
  name: "FavSider",
  props: {
    value: { type: String, required: false },
    groups: { type: Array as PropType<SiteGroup[]>, required: true },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    return () => (
      <div class="favs-sider h-full flex flex-col p-2">
        <div class="h-full overflow-y-auto">
          <div class="space-y-1">
            {props.groups.map((g) => {
              const isActive = props.value === g.key;
              const iconEl = g.favicon ? (
                <img
                  src={g.favicon}
                  alt={g.label}
                  class="w-[18px] h-[18px] rounded"
                />
              ) : (
                <div class="w-[18px] h-[18px] bg-gray-200 rounded text-[11px] flex items-center justify-center text-[#555]">
                  {g.label[0]?.toUpperCase()}
                </div>
              );
              return (
                <div
                  key={g.key}
                  class={`
                    flex items-center gap-2 w-full px-2 py-1.5 rounded-md cursor-pointer transition-colors
                    ${isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}
                  `}
                  onClick={() => emit("update:value", g.key)}
                >
                  {iconEl}
                  <span class="flex-1 min-w-0 truncate text-sm">{g.label}</span>
                  <Badge value={g.count} severity="secondary" class="ml-auto" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
});
