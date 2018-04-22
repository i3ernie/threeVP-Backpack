/**
 * Created by Hessberger on 18.03.2015.
 */
define('chaser/PositionChaser',["tween"], function ( TWEEN ) {

    var PositionChaser = function(obj, opt)
    {
        opt = opt || {};
        var sliderange = opt.sliderange || 20;
        var time = 2000;
        var axis = opt.axis || "z";
        var start = obj.position[axis];
        var stop = start + sliderange;
        var to = stop;
        var position = {  z: start };
        var target = {  z: to };
        var animate = false;


        var tween = new TWEEN.Tween(position).to(target, time)
            .onStart(function(){
                animate = true;
            })
            .onComplete(function(){
                animate = false;
                to = (to == start)? stop:start;
                tween.to({z: to}, time);
            })
            .onStop(function(){
                animate = false;
                to = (to == start)? stop:start;
                tween.to({z: to}, time);
            })
            .onUpdate(function(){
                obj.position[axis] = position.z;
            });
        this.toggle = function(){
            if (animate) {tween.stop(); }
            else tween.start();
        };
        this.close = function(){
            if( position.z == start ) return;
            if (animate) {tween.stop(); }
            tween.start();
        };
    };
    
    return PositionChaser;
});
/**
 * Created by Hessberger on 18.03.2015.
 */
define('chaser/RotationChaser',["lodash", "tween"], function ( _, TWEEN ) {
    
    var defaults = {
        hinge:"left",
        dir:"y",
        odir:"in",
        val:1.57
    };
    
    var dirs = {"left":"y", "right":"y", "top" : "x", "bottom" : "x"};

    var RotationChaser = function( obj, opt )
    {
        opt = opt || {};
        var options = _.extend(defaults, opt);
        options.dir = dirs[options.hinge] || defaults.dir;
        var angle = {left:-options.val, right:options.val, o:-options.val, u:options.val, in:1, out:-1};
        var start = obj.rotation[options.dir];
        var stop = start+angle[options.hinge]*angle[options.odir];
        var to = stop;
        var rotation = {  y: start };
        var target = {  y: stop };
        var animate = false;
        var time = 2000;

        var tween = new TWEEN.Tween( rotation ).to(target, time)
        .onStart(function(){
            animate = true;
        })
        .onComplete(function(){
            animate = false;
            to = (to === start)? stop:start;
            tween.to({y: to}, time);
        })
        .onStop(function(){
            animate = false;
            to = (to === start)? stop:start;
            tween.to({y: to}, time);
        })
        .onUpdate(function(){
            obj.rotation[options.dir] = rotation.y;
        });

        this.start = function(){
            tween.start();
        };
        this.toggle = function(){
            if ( animate ) tween.stop();
            else tween.start();
        };
        this.close = function(){
            if( rotation.y === start ) return;
            if (animate) {tween.stop(); }
            tween.start();
        };

    };
    return RotationChaser;
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define('chaser/PositionTween',["chaser/PositionChaser"], function( Chaser ){
    
    var makeTween = function( DomEvents, mLade )
    {
        var o = this.model.attributes;
        
        var tween = new Chaser( mLade, {odir:o.dir} );
        
        var onClick = function( ev ){
            ev.cancelBubble = true;
            tween.toggle();
        };
        DomEvents.addEventListener( mLade, "click", onClick );
        mLade.addEventListener("removed", function(){ DomEvents.removeEventListener( mLade, "click", onClick ); });
    };
    return makeTween;

});


/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define('threeVP-Animation',["chaser/PositionChaser", "chaser/RotationChaser", "chaser/PositionTween"], function( PositionChaser, RotationChaser, PositionTween ){
    return {
        PositionChaser : PositionChaser,
        RotationChaser : RotationChaser,
        PositionTween  : PositionTween
    };
});
