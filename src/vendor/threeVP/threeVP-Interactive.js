/**
 * Created by bernie on 05.12.15.
 */
define('Draggable',["lodash", "cmd"], function ( _, CMD )
{
    var events = ["mousedown", "mouseup"];
    
    var mouseDown = function( ev ){ 
        CMD.trigger("startTracking", ev); 
    };
    var mouseUp = function( ev ){ 
        CMD.trigger("stopTracking", ev); 
    };
    
    
    var Draggable = {
        
        DomEvents : null,
        
        userEvents : events,
        
        init : function( VP ){
            this.DomEvents = VP.DomEvents;
        },
        
        makeDraggable : function( el, opt ) {
            if ( this.DomEvents === null ) {
                console.log( "Draggable.VP is null, you must set aktive VP" );
                return;
            }
            var scope = el || this;
            
            el.track = function( pos ){
                //scope.position.addVectors( pos );
                //console.log( pos );
                scope.position.x = pos.x;
                scope.position.z = pos.z;
            };
            
            this.DomEvents.addEventListener( scope, events[0], mouseDown );
            this.DomEvents.addEventListener( scope, events[1], mouseUp );
        },

        onMouseDown : CMD.startTracking
    };

    return Draggable;
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define('Interactive',["three", "lodash"], function( THREE, _ ){
    
    var events = ["mousedown", "mouseup", "click"];
    
    var Interactive = {
        
        DomEvents : null,
        
        init : function( VP ){
            this.DomEvents = VP.DomEvents;
        },
        
        makeInteractive : function( el ) {
            var _eventsMap = {
                mousedown : el._onMousedown,
                mouseup : el._onMouseup,
                dblclick : el._onDblclick,
                click : el._onClick
            };
            var scope = this;
            
            
            scope.DomEvents.on( el, "click", this.onClick );
            _.each( events, function( ev ){
                scope.DomEvents.addEventListener( el, ev, el._eventsMap[ev] );
            });
            this.DomActive = true;
        },
        
        onClick : function(){},
        onMousedown : function(){}
    };
    
    return Interactive;
});

/**
 * Created by bernie on 08.11.15.
 */
define('utilities/IntersectPlane',["three", "lodash"], function ( THREE, _ ) {
    
    var pointer_position = new THREE.Vector3( 0,0,0 );
    
    var options = {
         width      : 100, 
         height     : 100,
         opacity    : 0.0,
         dir        : "xz"
    };

    var IPlane = function( VP, opt )
    {
        var scope = this;
        
        this.options = {};
        _.extend( this.options, options, opt );

        this.camera = VP.camera;
        this.enabled = false;
        this.visible = false;
        
        var side = /*this.options.opacity < .01 ? THREE.BackSide :*/ THREE.FrontSide;

        THREE.Mesh.call( this,
            new THREE.PlaneGeometry( this.options.width, this.options.height ),
            new THREE.MeshBasicMaterial({ opacity: this.options.opacity, transparent: true, side : side })
        );

        this._handleMouseMove = function(){ scope.handleMouseMove.apply(scope, arguments); };

        this.DomEvents = VP.DomEvents;

        if (this.options.dir === "xz") this.rotation.x = Math.PI * -.5;
        if (this.options.dir === "yz") this.rotation.y = Math.PI * -.5;
    };

    IPlane.prototype = _.create( THREE.Mesh.prototype, {
        constructor : IPlane,

        startTracking : function( mouse_position ){
            this.enabled = true;
            this.DomEvents.addEventListener( this, 'mousemove', this._handleMouseMove );
            this.position.set( mouse_position.x, mouse_position.y, mouse_position.z );
        },

        handleMouseMove : function( ev )
        {
            if ( this.enabled )
            {
                pointer_position.copy( ev.intersect.point );
                this.dispatchEvent({ type: "tracking", origDomEvent : ev, pointer_position : pointer_position });
                this.position.copy( pointer_position );
            }
        },
        
        stopTracking : function() 
        {
            if ( this.enabled )
            {
                this.enabled = false;
                this.DomEvents.removeEventListener( this, 'mousemove', this._handleMouseMove );
                this.position.y = -10;
            }
        }
    });

    return IPlane;
});
/**
 * Created by bernie on 01.11.15.
 */
define('plugins/plg.Tracking',["plugin", "three", "cmd", "utilities/IntersectPlane"], function( Plugin, THREE, CMD, IntersectPlane )
{
    var selected_block; 
    var intersect_plane;
    var mouse_position= new THREE.Vector3(0, 0, 0), 
        block_offset = new THREE.Vector3(0, 0, 0),
        track = new THREE.Vector3(0, 0, 0);

    var Tracking = function( opt )
    {
        Plugin.call( this, opt );
    };
    
    Tracking.prototype = Object.create( Plugin.prototype );
    Tracking.prototype.constructor = Tracking;
    //Tracking.prototype.super = Plugin.prototype;
    
    Tracking.prototype.registerEvents = function()
    {
        CMD.on( "viewportInitalized", function( VP )
        {    
            intersect_plane = new IntersectPlane( VP );
            VP.scene.add( intersect_plane );    
            
            intersect_plane.addEventListener( "tracking", this.onTrack );
            VP.DomEvents.addEventListener( VP.scene, "mouseup", this.stopTracking );
        }, this );

        CMD.on( "startTracking", this.startTracking, this );
        CMD.on( "stopTracking", this.stopTracking, this );
    };
    
    Tracking.prototype.removeEvents = function(){
        CMD.off( "startTracking", this.startTracking );
        CMD.off( "stopTracking", this.stopTracking);
    };
    
    Tracking.prototype.startTracking = function( ev )
    {
        CMD.VP.trigger( "disableControl" );

        ev.stopPropagation();
        
        selected_block = ev.target;

        mouse_position.copy( ev.intersect.point );
        block_offset.subVectors( selected_block.position, mouse_position );
        block_offset.y = selected_block.position.y;

        intersect_plane.startTracking( mouse_position );
    };
    
    Tracking.prototype.stopTracking = function()
    {
        CMD.VP.trigger( "enableControl" );
        intersect_plane.stopTracking();

        if ( selected_block !== null ) {
            selected_block = null;
            intersect_plane.position.y = 0;
        }
    };

    Tracking.prototype.onTrack = function( evt )
    {
        var ev = evt.origDomEvent;
        ev.stopPropagation();
       
        if ( selected_block !== null && intersect_plane === evt.target) {

            mouse_position.copy( ev.intersect.point );
            
            //set position
            selected_block.track( track.addVectors( mouse_position, block_offset) );
        }
    };

    return Tracking;
});

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define('plugins/plg.Draggable',["plugin", "Draggable", "cmd"], function( Plugin, Draggable, CMD ){
    var PlgDraggable = function(){
        this.super.constructor.call( this );
    };
    
    PlgDraggable.prototype = Object.create( Plugin.prototype );
    PlgDraggable.prototype.constructor = PlgDraggable;
    Draggable.prototype.super = Plugin.prototype;
    
    PlgDraggable.prototype.registerEvents = function()
    {
        CMD.Scene.on("added", function( el ){
            if ( el.userData && el.userData.draggable === true ) {
                Draggable.makeDraggable( el );
            }
        });
    };
    
    return PlgDraggable;
});

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define('threeVP-Interactive',["Draggable", "Interactive", "plugins/plg.Tracking", "plugins/plg.Draggable"], function( Draggable, Interactive, PlgTracking, PlgDraggable ){
    return {
        Draggable       : Draggable,
        Interactive     : Interactive,
        PlgTracking     : PlgTracking,
        PlgDraggable    : PlgDraggable
    };
});
