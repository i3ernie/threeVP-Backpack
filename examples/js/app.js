/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define(['three', 'Viewport', 'UniversalLoader'], function( THREE, Viewport, UniversalLoader ){
    
    return {
        init : function(){
            this.VP = new Viewport( );  
        },
        
        start : function(){
            var VP = this.VP;
           
            var geo = new THREE.BoxGeometry(.1, .1, .1);
            var mesh = new THREE.Mesh( geo );
            mesh.position.set(.6,.8,-.3);
            
            var loader = new UniversalLoader();
            
            loader.load('data/table1/untitled.dae', function( obj ){
                VP.scene.add( obj );
            });
            
            VP.scene.add( mesh );
            VP.camera.position.z = 10;
            
            VP.start();

        }
    };
        
});
