import browser from 'webextension-polyfill';

import General from './components/General';
import Shortcuts from './components/Shortcuts';
import CacheList from './components/CacheList';
import DisabledList from './components/DisabledList';
import LayoutConfig from './components/LayoutConfig';
import Contact from './components/Contact';
import Donate from './components/Donate';

export const OPTIONS_MENU = [
    {
        title: browser.i18n.getMessage('options_general'),
        component: General
    },
    {
        title: browser.i18n.getMessage('options_shortcuts'),
        component: Shortcuts
    },
    {
        title: browser.i18n.getMessage('options_layout'),
        component: LayoutConfig,
        auth: true
    },
    {
        title: browser.i18n.getMessage('options_cache_list'),
        component: CacheList
    },
    {
        title: browser.i18n.getMessage('options_disabled_list'),
        component: DisabledList
    },
    {
        title: browser.i18n.getMessage('options_contact'),
        component: Contact
    },
    {
        title: browser.i18n.getMessage('options_donate'),
        component: Donate
    }
];