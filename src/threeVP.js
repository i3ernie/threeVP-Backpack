/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define(["base64", "lodash", "Viewport", "threeVP-Extras", "threeVP-Animation"], function(base64, _, pack, Viewport, threeVPExtras, Animation ){
    return _.extend({}, pack, Viewport, threeVPExtras, Animation);
});

