<template>
    <div class="container">
        <div class="input-group">
            <div class="input-group-append">
                <span class="input-group-text">絞り込み日付</span>
            </div>
            <vue-monthly-picker v-model="query"></vue-monthly-picker>
            <button type="button" class="btn btn-primary" v-on:click="sumAccounts">絞り込み</button>
        </div>
        <p>支出：{{payments}}</p>
        <p>収入：{{incomes}}</p>
        <div class="input-group">
            <div class="input-group-append">
                <span class="input-group-text">￥</span>
            </div>
            <input v-model="money" class="form-contorl" placeholder="金額を入力してください!">
        </div>
        <div class="input-group">
            <div class="input-group-prepend">
                <div class="input-group-text">
                    <input type="checkbox" aria-label="Checkbox for following text input" v-model="income">　収入
                </div>
            </div>
        </div>
        <div class="input-group">
            <div class="input-group-prepend">
                <label class="input-group-text" for="inputGroupSelect01">分類</label>
            </div>
            <select class="custom-select" id="inputGroupSelect01" v-model="category">
                <option selected>Choose...</option>
                <option v-for="(ca, key, index) in categories" :key=index>{{ca.name}}</option>
            </select>
        </div>
        <div class="input-group">
            <div class="input-group-append">
                <span class="input-group-text">日付</span>
            </div>
            <date-picker v-model="date" :config="options"></date-picker>
        </div>
        <div class="input-group">
            <div class="input-group-append">
                <span class="input-group-text">摘要</span>
            </div>
            <input v-model="about" class="form-control" placeholder="摘要を入力してください!">
        </div>
        <button type="button" class="btn btn-primary" v-on:click="postAccounts">追加</button>
        <div>
            <button type="button" class="btn btn-primary" v-on:click="sumCategories">カテゴリごとの集計表示</button>
            <p v-for="(sum, key, index) in sums" :key=index>
                {{sum.name.name}} : {{sum.value}}
            </p>
        </div>
    </div>
</template>

<script>
import axios from 'axios';
import moment from 'moment';
import datePicker from 'vue-bootstrap-datetimepicker';
import VueMonthlyPicker from 'vue-monthly-picker';

export default {
    data: function() {
        return {
            accounts: [],
            money: "",
            about: "",
            category: "",
            income: false,
            date: null,
            options: {
                format: 'YYYY/MM/DD',
                useCurrent: false
            },
            categories: [],
            incomes: 0,
            payments: 0,
            query: moment(new Date()).format('YYYY/MM'),
            sums: []
        }
    },
    created: function() {
        this.getAccounts();
        this.getCategories();
    },
    mounted: function() {
        this.sumAccounts();
    },
    methods: {
        getAccounts: function() {
            axios.get('/api/accounts').then(response => {
                for(let i = 0; i < response.data.length; i++) {
                    this.accounts.push(response.data[i]);
                }
            }, (error) => {
                condole.log(error);
            })
        },
        postAccounts: function() {
            axios.post('/api/accounts', {account: {money: Number(this.money), date: this.date, income: this.income, about: this.about, category: this.category}}).then((response) => {

                const date = new Date(this.query);

                if(moment(response.data.date).format('YYYY/MM') === moment(date).format('YYYY/MM')) {
                    if (this.income === true) {
                        this.incomes += Number(this.money);
                    } else {
                        this.payments += Number(this.money);
                    }
                }

                this.accounts.unshift(response.data);
                this.money = "";
                this.about = "";
                this.category = "";
                this.income = false;
                this.date = "";
                this.$forceUpdate();
            }, (error) => {
                console.log(error);
            })
        },
        getCategories: function() {
            axios.get('/api/categories').then((response) => {
                console.log(response.data);
                for(var i = 0; i < response.data.length; i++){
                    this.categories.push(response.data[i]);
                }
                console.log(this.categories);
            }, (error) => {
                console.log(error);
            })
        },
        sumAccounts: function() {
            axios.get('api/accounts').then((response) => {

                const date = new Date(this.query);

                this.incomes = 0;
                this.payments = 0;

                for(var i = 0; i < response.data.length; i++){
                    if(moment(response.data[i].date).format('YYYY/MM') === moment(date).format('YYYY/MM')) {
                        if(response.data[i].income === true){
                            this.incomes += response.data[i].money;
                        } else {
                            this.payments += response.data[i].money;
                        }
                    }
                }
                this.$forceUpdate();
            }, (error) => {
                console.log(error);
            });
        },
        sumCategories: function() {
            this.sums = [];
            const date = new Date(this.query);
            for(var i = 0; i < this.categories.length; i++){
                this.sums.push({name: this.categories[i], value: 0});
                for(var j = 0; j < this.accounts.length; j++){
                    if(this.accounts[j].category === this.categories[i].name 
                        && moment(this.accounts[j].date).format('YYYY/MM') === moment(date).format('YYYY/MM')){
                        this.sums[i].value += this.accounts[j].money;
                    }
                }
            }
            console.log(this.sums);
        },
    },
    components: {
        datePicker,
        VueMonthlyPicker
    }
}
</script>
