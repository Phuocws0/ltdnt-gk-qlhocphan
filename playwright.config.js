const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',timeout:60000,workers:1,use:{channel:'chromium',launchOptions:{slowMo:250},baseURL:'http://localhost:8081',viewport:{width:1440,height:1000},video:'on',screenshot:'only-on-failure'},reporter:[['list'],['html',{open:'never'}]]});
