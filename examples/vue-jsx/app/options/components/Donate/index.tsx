import { defineComponent } from "vue";
import { createURL } from 'app/util';
import browser from 'webextension-polyfill'
import './index.less';

export default defineComponent({
    name: "Donate",
    setup(props) {

        const toAfdian = () => {
            createURL('https://afdian.com/a/gomi_gxy/plan');
        }


        return () => (
            <div class="options-general">
                <div class="options-content-h">
                    <div class="options-donate-item" onClick={toAfdian}>
                        <div><a href="https://afdian.com/a/gomi_gxy/plan" target="_blank">{browser.i18n.getMessage('tips_afdian')}</a></div>
                    </div>
                </div>
            </div>
        );
    }
});
