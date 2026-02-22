import { ColorPicker } from "vue3-colorpicker";

export default function render(config: any, onChange: Function) {
  return config.map((item: any) => {
    switch (item.type) {
      case "group":
        return (
          <div class="general-group">
            <div class="general-title">{item.title}</div>
            <van-cell-group inset>
              {render(item.config, onChange)}
            </van-cell-group>
          </div>
        );
      case "color-picker":
        return (
          <van-field
            label-width="300"
            input-align="right"
            name="switch"
            label={item.title}
            v-slots={{
              input: () => (
                <ColorPicker
                  theme="black"
                  format="rgb"
                  shape="circle"
                  v-model:pureColor={item.value}
                  onUpdate:pureColor={onChange}
                />
              ),
            }}
          ></van-field>
        );
      case "switch":
        return (
          <van-field
            label-width="300"
            input-align="right"
            name="switch"
            label={item.title}
            v-slots={{
              input: () => (
                <van-switch
                  size="15px"
                  v-model={item.value}
                  onChange={onChange}
                />
              ),
            }}
          ></van-field>
        );
      case "select":
        return (
          <van-field
            label-width="300"
            input-align="right"
            name="select"
            label={item.title}
            v-slots={{
              input: () => {
                const selectedValue = item.value ?? "";
                return (
                  <div class="native-select-wrap">
                    <select
                      class="native-select"
                      value={String(selectedValue)}
                      onChange={(e: any) => {
                        const newValStr = e.target.value;
                        const matched = (item.options || []).find((o: any) => String(o.value) === newValStr);
                        const newVal = matched ? matched.value : newValStr;
                        item.value = newVal;
                        onChange();
                      }}
                    >
                      {item.options?.map((opt: any) => (
                        <option value={String(opt.value)} selected={String(opt.value) === String(selectedValue)}>{opt.label}</option>
                      ))}
                    </select>
                    {/* Tabler chevron-down icon (inline SVG) */}
                    <svg class="native-select-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                );
              },
            }}
          ></van-field>
        );
      default:
        return null;
    }
  });
}
