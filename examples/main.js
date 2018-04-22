/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

//import _ from './vendor/threeVP'; 
//import THREE from './vendor/threeVP';
//import Viewport from './vendor/threeVP';

require.config({
     baseUrl:"./js",

    "paths": {
        
        "data"      : "../data"
    }
});

    require(['app'], function( app )
    {
        app.init();
        app.start();
    });