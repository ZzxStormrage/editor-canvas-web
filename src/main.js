import { createApp } from 'vue';
import App from './App.vue';
import { createVuetifyPlugin } from './plugins/vuetify.js';
import './style.css';

createApp(App).use(createVuetifyPlugin()).mount('#app');
