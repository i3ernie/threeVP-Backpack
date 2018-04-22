/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define('factorys/MaterialFactory',["three", "lodash", "factorys/Factory", "module"], function( THREE, _, Factory, module ){

    var catalog = {}, presets = {};
    var loaderMat = new THREE.MaterialLoader();
    var loaderTex = new THREE.TextureLoader();
    var loaderImg = new THREE.ImageLoader();
    var RGBFormat = 1022;
    var RGBAFormat = 1023;
    var colors = ['color', 'emissive', 'specular'];
    var tempColor = new THREE.Color();

    var options = {
        texturePath : "textures/",
        defaultMatType : "MeshPhongMaterial",
        myPath      : module.uri.substring(0, module.uri.lastIndexOf("/")+1 ) + "textures/",
        debug       : false,
        reflection  : false,
        WIDTH       : window.innerWidth,
        HEIGHT      : window.innerHeight,
        clipBias    : 0.003,
        color       : 0x777777
    };

    var setUV = function( jsonMaterial )
    {
        var trans = {};
        if (jsonMaterial.userData.size)
        {
            trans.size = jsonMaterial.userData.size;
            var u = 100 / trans.size[0];
            var v = 100 / trans.size[1];

            if ( u === 1.0 ) u = 0.9999;
            if ( v === 1.0 ) v = 0.9999;
   
            if (!jsonMaterial.map.wrap) jsonMaterial.map.wrap = [THREE.RepeatWrapping, THREE.RepeatWrapping];
            jsonMaterial.map.repeat = [u, v];
        }
        
        return jsonMaterial;
    };

    var MFactory = function( objCat, opt )
    {
        if ( objCat ) {
            if ( objCat.materials ) {
                this.addCatalog( objCat.materials );
            } else {
                this.addCatalog( objCat );
            }
        }
        
        this.options = _.extend( {}, options, opt );

        this.textures = {};
        this.materials = {};

        loaderImg.setPath( this.options.texturePath );
        loaderMat.setTextures( this.textures );
    };
    
    MFactory.prototype = _.create( Factory.prototype, {
        
        constructor : MFactory,
        
        loadCatalog : function( urlCat, callback )
        {
            require(["json!"+urlCat], function( objCat ){
                this.addCatalog( objCat );
                if ( typeof callback === "function" ) { 
                    callback( this ); 
                }
            }.bind(this));
        },

        loadPresets : function( url )
        {
            require(["json!"+url], function( obj ){
                this.addPresets( obj );
            }.bind(this));
        },
        
        addCatalog : function( objCat ){ 
            _.each( objCat, function( mat ){
                if ( !mat.userData ) mat.userData = {};
                _.each( colors, function( col ){
                    if ( mat[col] ){
                        if ( mat[col] instanceof Array ) {
                            mat.userData[col] = mat[col];
                            tempColor.setRGB( mat[col][0], mat[col][1], mat[col][2] );
                            mat[col] = tempColor.getHex();
                        }
                        if ( typeof mat[col] === "string" ) {
                            mat.userData[col] = mat[col];
                            tempColor.setStyle( mat[col] );
                            mat[col] = tempColor.getHex();
                        }
                    }
                });
            });

            _.extend( catalog, objCat );
        },
        
        addPresets : function( obj ){
            _.extend( presets, obj );
        },
        
        /**
         * 
         * @param {type} matKey
         * @returns {undefined}
         */
        deleteMaterial : function( matKey ){
            if ( this.materials[ matKey ] ) { 
                this.materials[ matKey ].dispose();
                this.materials[ matKey ] = null; 
            }
        },
        
        enableReflection : function( VP ){
            this.VP = VP;
            this.options.reflection = true;
            var cubeCamera1 = new THREE.CubeCamera( 1, 1000, 256 );
            
            cubeCamera1.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;
            cubeCamera1.position.set(0, 5, 0);
            VP.scene.add( cubeCamera1 );
            this.planeMirror = cubeCamera1.renderTarget;
            VP.loop.add( function(){ cubeCamera1.updateCubeMap( VP.renderer, VP.scene ); });
        },

        /**
         *
         * @param matKey {string} key of material
         * @param copy {boolean} return copy or reference
         * @returns {*}
         */
        getMaterial : function( matKey, copy )
        {
            if ( copy === undefined ) copy = true;
            
            if ( !catalog[ matKey ] ) {
                return null;
            }

            //cached?
            if ( this.materials[ matKey ] ){ 
                return ( copy )? this.materials[ matKey ].clone() : this.materials[ matKey ];
            }

            var jsonCatMat = catalog[ matKey ];
            var jsonMaterial = _.clone( jsonCatMat );
            var mapDefault = { wrap:[], magFilter:[] };

            if ( !jsonMaterial.type ) jsonMaterial.type = options.defaultMatType;

            if ( jsonMaterial.userData && jsonMaterial.userData.preset && presets[jsonMaterial.userData.preset] ){
                jsonMaterial = _.extend({}, presets[jsonMaterial.userData.preset], jsonMaterial );
            }

            if ( jsonCatMat.map )
            {
                if ( jsonMaterial.map.wrap ) {
                    if ( typeof jsonMaterial.map.wrap[0] === "string" ) { 
                        jsonMaterial.map.wrap[0] = THREE[jsonMaterial.map.wrap[0]]; 
                    }
                    if ( typeof jsonMaterial.map.wrap[1] === "string" ) {
                        jsonMaterial.map.wrap[1] = THREE[jsonMaterial.map.wrap[1]];
                    }
                } else{
                    if ( jsonMaterial.map.rotation ) {
                        jsonMaterial.map.wrap = [THREE.RepeatWrapping, THREE.RepeatWrapping];
                    }
                }
                
                if ( jsonMaterial.userData && jsonMaterial.userData.size ) {
                    setUV( jsonMaterial );
                }
                
                mapDefault = _.extend(mapDefault, jsonCatMat.map );
                
                this._createTexture("map", jsonMaterial, mapDefault);
            }
            
            var maps = ["bumpMap", "roughnessMap", "alphaMap", "normalMap", "emissiveMap", "specularMap"];
            
            //Maps
            _.each( maps , function( mapName ){
                if ( jsonCatMat[ mapName ] ) {
                    this._createTexture( mapName, jsonMaterial, mapDefault );
                }
            }.bind(this));

            //envMap
            if ( jsonCatMat.envMap ) {
                
                if ( !jsonCatMat.envMap.image === "flatMirror" ){
                    this._createTexture("envMap", jsonMaterial, mapDefault);
                } else {
                    jsonMaterial.envMap = null;
                }
            }

            this.materials[ matKey ] = loaderMat.parse( jsonMaterial );

            if (jsonMaterial.userData) {
                this.materials[ matKey ].userData = jsonMaterial.userData;
            }

            if ( jsonCatMat.envMap  && jsonCatMat.envMap.image === "flatMirror" && this.options.reflection ) {

                this.materials[ matKey ].envMap = this.planeMirror;
                 this.VP.loop.add( function(){ 
                     this.materials[ matKey ].envMap = this.planeMirror.texture;
                 }.bind(this));
               
            }
            
            return ( copy )? this.materials[ matKey ].clone() : this.materials[ matKey ];
        },
        
        _createTexture : function( map, jsonMaterial, defaultMap )
        {
            var myMap = jsonMaterial[ map ];
            var texName = map+"_"+myMap.image;

            if ( this.textures[ texName ] ) {
                jsonMaterial[map] = texName;
                return;
            }

            var mapOpt = {
                    mapping     : myMap.mapping || defaultMap.mapping, 
                    wrapS       : myMap.wrap ? myMap.wrap[0] : defaultMap.wrap[0], 
                    wrapT       : myMap.wrap ? myMap.wrap[1] : defaultMap.wrap[1], 
                    magFilter   : myMap.magFilter ? myMap.magFilter[0] : defaultMap.magFilter[0], 
                    minFilter   : myMap.magFilter ? myMap.magFilter[1] : defaultMap.magFilter[1], 
                    format      : myMap.format      || map.format,
                    type        : myMap.type        || defaultMap.type,
                    anisotropy  : myMap.anisotropy  || defaultMap.anisotropy,
                    encoding    : myMap.encoding    || defaultMap.encoding,
                    rotation    : myMap.rotation ? myMap.rotation : defaultMap.rotation || 0,
                    center      : myMap.center ? myMap.center : [0,0]
            };

            this.textures[ texName ] = new THREE.Texture( undefined, mapOpt.mapping, mapOpt.wrapS, mapOpt.wrapT, mapOpt.magFilter, mapOpt.minFilter, mapOpt.format, mapOpt.type, mapOpt.anisotropy, mapOpt.encoding );
            
            
            if ( myMap.repeat ) this.textures[ texName ].repeat.fromArray(  myMap.repeat );
            if ( myMap.rotation ) this.textures[ texName ].rotation = myMap.rotation;
            
            jsonMaterial[ map ] = texName;
                            
            this.loadImage( this.textures[ texName ], myMap.image );
        },
        
        loadImage : function( texture, url )
        {    
            var onProgress = function(){};
            var onError = function(){};
            
            loaderImg.load( url, function ( image ) 
            {
                // JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
                var isJPEG = url.search( /\.(jpg|jpeg)$/ ) > 0 || url.search( /^data\:image\/jpeg/ ) === 0;

                texture.format = isJPEG ? RGBFormat : RGBAFormat;
                texture.image = image;
                texture.needsUpdate = true;

            }, onProgress, onError );
        }
    });

    return MFactory;
});
/**
 * 
 * @param {type} THREE
 * @param {type} _
 * @param {type} $
 * @param {type} Backbone
 * @param {type} CMD
 * @returns {packL#5.packAnonym$1}
 */

define('threeVP-MaterialFactory',[ "factorys/MaterialFactory"], 
function( MaterialFactory ) {
    return {
        MaterialFactory       : MaterialFactory
     };
});

