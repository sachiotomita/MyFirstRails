import Vue from 'vue/dist/vue.esm.js';
import VueRouter from 'vue-router';
import Index from '../components/web/Index.vue';
import About from '../components/web/About.vue';
import Contact from '../components/web/Contact.vue';
import Payment from '../components/web/Payment.vue';

import ProductsIndex from '../components/products/Index.vue';
import ProductsCreate from '../components/products/Create.vue';
import ProductsShow from '../components/products/Show.vue';
import ProductsEdit from '../components/products/Edit.vue';

Vue.use(VueRouter)

export default new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Index },
    { path: '/about', component: About },
    { path: '/contact', component: Contact },
    { path: '/payments', component: Payment },
    { path: '/products', component: ProductsIndex },
    { path: '/products/new', component: ProductsCreate },
    { path: '/products/:id', component: ProductsShow, name: 'products_show'},
    { path: '/products/:id/edit', component: ProductsEdit, name: 'products_edits'},
  ],
})