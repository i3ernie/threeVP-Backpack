define('vendor/three/loaders/ColladaLoader',["three"], function(THREE){
/**
 * @author mrdoob / http://mrdoob.com/
 * @author Mugen87 / https://github.com/Mugen87
 */

THREE.ColladaLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.ColladaLoader.prototype = {

	constructor: THREE.ColladaLoader,

	crossOrigin: 'Anonymous',

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var path = scope.path === undefined ? THREE.LoaderUtils.extractUrlBase( url ) : scope.path;

		var loader = new THREE.FileLoader( scope.manager );
		loader.load( url, function ( text ) {

			onLoad( scope.parse( text, path ) );

		}, onProgress, onError );

	},

	setPath: function ( value ) {

		this.path = value;

	},

	options: {

		set convertUpAxis( value ) {

			console.warn( 'THREE.ColladaLoader: options.convertUpAxis() has been removed. Up axis is converted automatically.' );

		}

	},

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;

	},

	parse: function ( text, path ) {

		function getElementsByTagName( xml, name ) {

			// Non recursive xml.getElementsByTagName() ...

			var array = [];
			var childNodes = xml.childNodes;

			for ( var i = 0, l = childNodes.length; i < l; i ++ ) {

				var child = childNodes[ i ];

				if ( child.nodeName === name ) {

					array.push( child );

				}

			}

			return array;

		}

		function parseStrings( text ) {

			if ( text.length === 0 ) return [];

			var parts = text.trim().split( /\s+/ );
			var array = new Array( parts.length );

			for ( var i = 0, l = parts.length; i < l; i ++ ) {

				array[ i ] = parts[ i ];

			}

			return array;

		}

		function parseFloats( text ) {

			if ( text.length === 0 ) return [];

			var parts = text.trim().split( /\s+/ );
			var array = new Array( parts.length );

			for ( var i = 0, l = parts.length; i < l; i ++ ) {

				array[ i ] = parseFloat( parts[ i ] );

			}

			return array;

		}

		function parseInts( text ) {

			if ( text.length === 0 ) return [];

			var parts = text.trim().split( /\s+/ );
			var array = new Array( parts.length );

			for ( var i = 0, l = parts.length; i < l; i ++ ) {

				array[ i ] = parseInt( parts[ i ] );

			}

			return array;

		}

		function parseId( text ) {

			return text.substring( 1 );

		}

		function generateId() {

			return 'three_default_' + ( count ++ );

		}

		function isEmpty( object ) {

			return Object.keys( object ).length === 0;

		}

		// asset

		function parseAsset( xml ) {

			return {
				unit: parseAssetUnit( getElementsByTagName( xml, 'unit' )[ 0 ] ),
				upAxis: parseAssetUpAxis( getElementsByTagName( xml, 'up_axis' )[ 0 ] )
			};

		}

		function parseAssetUnit( xml ) {

			if ( ( xml !== undefined ) && ( xml.hasAttribute( 'meter' ) === true ) ) {

				return parseFloat( xml.getAttribute( 'meter' ) );

			} else {

				return 1; // default 1 meter

			}

		}

		function parseAssetUpAxis( xml ) {

			return xml !== undefined ? xml.textContent : 'Y_UP';

		}

		// library

		function parseLibrary( xml, libraryName, nodeName, parser ) {

			var library = getElementsByTagName( xml, libraryName )[ 0 ];

			if ( library !== undefined ) {

				var elements = getElementsByTagName( library, nodeName );

				for ( var i = 0; i < elements.length; i ++ ) {

					parser( elements[ i ] );

				}

			}

		}

		function buildLibrary( data, builder ) {

			for ( var name in data ) {

				var object = data[ name ];
				object.build = builder( data[ name ] );

			}

		}

		// get

		function getBuild( data, builder ) {

			if ( data.build !== undefined ) return data.build;

			data.build = builder( data );

			return data.build;

		}

		// animation

		function parseAnimation( xml ) {

			var data = {
				sources: {},
				samplers: {},
				channels: {}
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				var id;

				switch ( child.nodeName ) {

					case 'source':
						id = child.getAttribute( 'id' );
						data.sources[ id ] = parseSource( child );
						break;

					case 'sampler':
						id = child.getAttribute( 'id' );
						data.samplers[ id ] = parseAnimationSampler( child );
						break;

					case 'channel':
						id = child.getAttribute( 'target' );
						data.channels[ id ] = parseAnimationChannel( child );
						break;

					default:
						console.log( child );

				}

			}

			library.animations[ xml.getAttribute( 'id' ) ] = data;

		}

		function parseAnimationSampler( xml ) {

			var data = {
				inputs: {},
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'input':
						var id = parseId( child.getAttribute( 'source' ) );
						var semantic = child.getAttribute( 'semantic' );
						data.inputs[ semantic ] = id;
						break;

				}

			}

			return data;

		}

		function parseAnimationChannel( xml ) {

			var data = {};

			var target = xml.getAttribute( 'target' );

			// parsing SID Addressing Syntax

			var parts = target.split( '/' );

			var id = parts.shift();
			var sid = parts.shift();

			// check selection syntax

			var arraySyntax = ( sid.indexOf( '(' ) !== - 1 );
			var memberSyntax = ( sid.indexOf( '.' ) !== - 1 );

			if ( memberSyntax ) {

				//  member selection access

				parts = sid.split( '.' );
				sid = parts.shift();
				data.member = parts.shift();

			} else if ( arraySyntax ) {

				// array-access syntax. can be used to express fields in one-dimensional vectors or two-dimensional matrices.

				var indices = sid.split( '(' );
				sid = indices.shift();

				for ( var i = 0; i < indices.length; i ++ ) {

					indices[ i ] = parseInt( indices[ i ].replace( /\)/, '' ) );

				}

				data.indices = indices;

			}

			data.id = id;
			data.sid = sid;

			data.arraySyntax = arraySyntax;
			data.memberSyntax = memberSyntax;

			data.sampler = parseId( xml.getAttribute( 'source' ) );

			return data;

		}

		function buildAnimation( data ) {

			var tracks = [];

			var channels = data.channels;
			var samplers = data.samplers;
			var sources = data.sources;

			for ( var target in channels ) {

				if ( channels.hasOwnProperty( target ) ) {

					var channel = channels[ target ];
					var sampler = samplers[ channel.sampler ];

					var inputId = sampler.inputs.INPUT;
					var outputId = sampler.inputs.OUTPUT;

					var inputSource = sources[ inputId ];
					var outputSource = sources[ outputId ];

					var animation = buildAnimationChannel( channel, inputSource, outputSource );

					createKeyframeTracks( animation, tracks );

				}

			}

			return tracks;

		}

		function getAnimation( id ) {

			return getBuild( library.animations[ id ], buildAnimation );

		}

		function buildAnimationChannel( channel, inputSource, outputSource ) {

			var node = library.nodes[ channel.id ];
			var object3D = getNode( node.id );

			var transform = node.transforms[ channel.sid ];
			var defaultMatrix = node.matrix.clone().transpose();

			var time, stride;
			var i, il, j, jl;

			var data = {};

			// the collada spec allows the animation of data in various ways.
			// depending on the transform type (matrix, translate, rotate, scale), we execute different logic

			switch ( transform ) {

				case 'matrix':

					for ( i = 0, il = inputSource.array.length; i < il; i ++ ) {

						time = inputSource.array[ i ];
						stride = i * outputSource.stride;

						if ( data[ time ] === undefined ) data[ time ] = {};

						if ( channel.arraySyntax === true ) {

							var value = outputSource.array[ stride ];
							var index = channel.indices[ 0 ] + 4 * channel.indices[ 1 ];

							data[ time ][ index ] = value;

						} else {

							for ( j = 0, jl = outputSource.stride; j < jl; j ++ ) {

								data[ time ][ j ] = outputSource.array[ stride + j ];

							}

						}

					}

					break;

				case 'translate':
					console.warn( 'THREE.ColladaLoader: Animation transform type "%s" not yet implemented.', transform );
					break;

				case 'rotate':
					console.warn( 'THREE.ColladaLoader: Animation transform type "%s" not yet implemented.', transform );
					break;

				case 'scale':
					console.warn( 'THREE.ColladaLoader: Animation transform type "%s" not yet implemented.', transform );
					break;

			}

			var keyframes = prepareAnimationData( data, defaultMatrix );

			var animation = {
				name: object3D.uuid,
				keyframes: keyframes
			};

			return animation;

		}

		function prepareAnimationData( data, defaultMatrix ) {

			var keyframes = [];

			// transfer data into a sortable array

			for ( var time in data ) {

				keyframes.push( { time: parseFloat( time ), value: data[ time ] } );

			}

			// ensure keyframes are sorted by time

			keyframes.sort( ascending );

			// now we clean up all animation data, so we can use them for keyframe tracks

			for ( var i = 0; i < 16; i ++ ) {

				transformAnimationData( keyframes, i, defaultMatrix.elements[ i ] );

			}

			return keyframes;

			// array sort function

			function ascending( a, b ) {

				return a.time - b.time;

			}

		}

		var position = new THREE.Vector3();
		var scale = new THREE.Vector3();
		var quaternion = new THREE.Quaternion();

		function createKeyframeTracks( animation, tracks ) {

			var keyframes = animation.keyframes;
			var name = animation.name;

			var times = [];
			var positionData = [];
			var quaternionData = [];
			var scaleData = [];

			for ( var i = 0, l = keyframes.length; i < l; i ++ ) {

				var keyframe = keyframes[ i ];

				var time = keyframe.time;
				var value = keyframe.value;

				matrix.fromArray( value ).transpose();
				matrix.decompose( position, quaternion, scale );

				times.push( time );
				positionData.push( position.x, position.y, position.z );
				quaternionData.push( quaternion.x, quaternion.y, quaternion.z, quaternion.w );
				scaleData.push( scale.x, scale.y, scale.z );

			}

			if ( positionData.length > 0 ) tracks.push( new THREE.VectorKeyframeTrack( name + '.position', times, positionData ) );
			if ( quaternionData.length > 0 ) tracks.push( new THREE.QuaternionKeyframeTrack( name + '.quaternion', times, quaternionData ) );
			if ( scaleData.length > 0 ) tracks.push( new THREE.VectorKeyframeTrack( name + '.scale', times, scaleData ) );

			return tracks;

		}

		function transformAnimationData( keyframes, property, defaultValue ) {

			var keyframe;

			var empty = true;
			var i, l;

			// check, if values of a property are missing in our keyframes

			for ( i = 0, l = keyframes.length; i < l; i ++ ) {

				keyframe = keyframes[ i ];

				if ( keyframe.value[ property ] === undefined ) {

					keyframe.value[ property ] = null; // mark as missing

				} else {

					empty = false;

				}

			}

			if ( empty === true ) {

				// no values at all, so we set a default value

				for ( i = 0, l = keyframes.length; i < l; i ++ ) {

					keyframe = keyframes[ i ];

					keyframe.value[ property ] = defaultValue;

				}

			} else {

				// filling gaps

				createMissingKeyframes( keyframes, property );

			}

		}

		function createMissingKeyframes( keyframes, property ) {

			var prev, next;

			for ( var i = 0, l = keyframes.length; i < l; i ++ ) {

				var keyframe = keyframes[ i ];

				if ( keyframe.value[ property ] === null ) {

					prev = getPrev( keyframes, i, property );
					next = getNext( keyframes, i, property );

					if ( prev === null ) {

						keyframe.value[ property ] = next.value[ property ];
						continue;

					}

					if ( next === null ) {

						keyframe.value[ property ] = prev.value[ property ];
						continue;

					}

					interpolate( keyframe, prev, next, property );

				}

			}

		}

		function getPrev( keyframes, i, property ) {

			while ( i >= 0 ) {

				var keyframe = keyframes[ i ];

				if ( keyframe.value[ property ] !== null ) return keyframe;

				i --;

			}

			return null;

		}

		function getNext( keyframes, i, property ) {

			while ( i < keyframes.length ) {

				var keyframe = keyframes[ i ];

				if ( keyframe.value[ property ] !== null ) return keyframe;

				i ++;

			}

			return null;

		}

		function interpolate( key, prev, next, property ) {

			if ( ( next.time - prev.time ) === 0 ) {

				key.value[ property ] = prev.value[ property ];
				return;

			}

			key.value[ property ] = ( ( key.time - prev.time ) * ( next.value[ property ] - prev.value[ property ] ) / ( next.time - prev.time ) ) + prev.value[ property ];

		}

		// animation clips

		function parseAnimationClip( xml ) {

			var data = {
				name: xml.getAttribute( 'id' ) || 'default',
				start: parseFloat( xml.getAttribute( 'start' ) || 0 ),
				end: parseFloat( xml.getAttribute( 'end' ) || 0 ),
				animations: []
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'instance_animation':
						data.animations.push( parseId( child.getAttribute( 'url' ) ) );
						break;

				}

			}

			library.clips[ xml.getAttribute( 'id' ) ] = data;

		}

		function buildAnimationClip( data ) {

			var tracks = [];

			var name = data.name;
			var duration = ( data.end - data.start ) || - 1;
			var animations = data.animations;

			for ( var i = 0, il = animations.length; i < il; i ++ ) {

				var animationTracks = getAnimation( animations[ i ] );

				for ( var j = 0, jl = animationTracks.length; j < jl; j ++ ) {

					tracks.push( animationTracks[ j ] );

				}

			}

			return new THREE.AnimationClip( name, duration, tracks );

		}

		function getAnimationClip( id ) {

			return getBuild( library.clips[ id ], buildAnimationClip );

		}

		// controller

		function parseController( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'skin':
						// there is exactly one skin per controller
						data.id = parseId( child.getAttribute( 'source' ) );
						data.skin = parseSkin( child );
						break;

					case 'morph':
						data.id = parseId( child.getAttribute( 'source' ) );
						console.warn( 'THREE.ColladaLoader: Morph target animation not supported yet.' );
						break;

				}

			}

			library.controllers[ xml.getAttribute( 'id' ) ] = data;

		}

		function parseSkin( xml ) {

			var data = {
				sources: {}
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'bind_shape_matrix':
						data.bindShapeMatrix = parseFloats( child.textContent );
						break;

					case 'source':
						var id = child.getAttribute( 'id' );
						data.sources[ id ] = parseSource( child );
						break;

					case 'joints':
						data.joints = parseJoints( child );
						break;

					case 'vertex_weights':
						data.vertexWeights = parseVertexWeights( child );
						break;

				}

			}

			return data;

		}

		function parseJoints( xml ) {

			var data = {
				inputs: {}
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'input':
						var semantic = child.getAttribute( 'semantic' );
						var id = parseId( child.getAttribute( 'source' ) );
						data.inputs[ semantic ] = id;
						break;

				}

			}

			return data;

		}

		function parseVertexWeights( xml ) {

			var data = {
				inputs: {}
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'input':
						var semantic = child.getAttribute( 'semantic' );
						var id = parseId( child.getAttribute( 'source' ) );
						var offset = parseInt( child.getAttribute( 'offset' ) );
						data.inputs[ semantic ] = { id: id, offset: offset };
						break;

					case 'vcount':
						data.vcount = parseInts( child.textContent );
						break;

					case 'v':
						data.v = parseInts( child.textContent );
						break;

				}

			}

			return data;

		}

		function buildController( data ) {

			var build = {
				id: data.id
			};

			var geometry = library.geometries[ build.id ];

			if ( data.skin !== undefined ) {

				build.skin = buildSkin( data.skin );

				// we enhance the 'sources' property of the corresponding geometry with our skin data

				geometry.sources.skinIndices = build.skin.indices;
				geometry.sources.skinWeights = build.skin.weights;

			}

			return build;

		}

		function buildSkin( data ) {

			var BONE_LIMIT = 4;

			var build = {
				joints: [], // this must be an array to preserve the joint order
				indices: {
					array: [],
					stride: BONE_LIMIT
				},
				weights: {
					array: [],
					stride: BONE_LIMIT
				}
			};

			var sources = data.sources;
			var vertexWeights = data.vertexWeights;

			var vcount = vertexWeights.vcount;
			var v = vertexWeights.v;
			var jointOffset = vertexWeights.inputs.JOINT.offset;
			var weightOffset = vertexWeights.inputs.WEIGHT.offset;

			var jointSource = data.sources[ data.joints.inputs.JOINT ];
			var inverseSource = data.sources[ data.joints.inputs.INV_BIND_MATRIX ];

			var weights = sources[ vertexWeights.inputs.WEIGHT.id ].array;
			var stride = 0;

			var i, j, l;

			// procces skin data for each vertex

			for ( i = 0, l = vcount.length; i < l; i ++ ) {

				var jointCount = vcount[ i ]; // this is the amount of joints that affect a single vertex
				var vertexSkinData = [];

				for ( j = 0; j < jointCount; j ++ ) {

					var skinIndex = v[ stride + jointOffset ];
					var weightId = v[ stride + weightOffset ];
					var skinWeight = weights[ weightId ];

					vertexSkinData.push( { index: skinIndex, weight: skinWeight } );

					stride += 2;

				}

				// we sort the joints in descending order based on the weights.
				// this ensures, we only procced the most important joints of the vertex

				vertexSkinData.sort( descending );

				// now we provide for each vertex a set of four index and weight values.
				// the order of the skin data matches the order of vertices

				for ( j = 0; j < BONE_LIMIT; j ++ ) {

					var d = vertexSkinData[ j ];

					if ( d !== undefined ) {

						build.indices.array.push( d.index );
						build.weights.array.push( d.weight );

					} else {

						build.indices.array.push( 0 );
						build.weights.array.push( 0 );

					}

				}

			}

			// setup bind matrix

			build.bindMatrix = new THREE.Matrix4().fromArray( data.bindShapeMatrix ).transpose();

			// process bones and inverse bind matrix data

			for ( i = 0, l = jointSource.array.length; i < l; i ++ ) {

				var name = jointSource.array[ i ];
				var boneInverse = new THREE.Matrix4().fromArray( inverseSource.array, i * inverseSource.stride ).transpose();

				build.joints.push( { name: name, boneInverse: boneInverse } );

			}

			return build;

			// array sort function

			function descending( a, b ) {

				return b.weight - a.weight;

			}

		}

		function getController( id ) {

			return getBuild( library.controllers[ id ], buildController );

		}

		// image

		function parseImage( xml ) {

			var data = {
				init_from: getElementsByTagName( xml, 'init_from' )[ 0 ].textContent
			};

			library.images[ xml.getAttribute( 'id' ) ] = data;

		}

		function buildImage( data ) {

			if ( data.build !== undefined ) return data.build;

			return data.init_from;

		}

		function getImage( id ) {

			return getBuild( library.images[ id ], buildImage );

		}

		// effect

		function parseEffect( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'profile_COMMON':
						data.profile = parseEffectProfileCOMMON( child );
						break;

				}

			}

			library.effects[ xml.getAttribute( 'id' ) ] = data;

		}

		function parseEffectProfileCOMMON( xml ) {

			var data = {
				surfaces: {},
				samplers: {}
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'newparam':
						parseEffectNewparam( child, data );
						break;

					case 'technique':
						data.technique = parseEffectTechnique( child );
						break;

					case 'extra':
						data.extra = parseEffectExtra( child );
						break;

				}

			}

			return data;

		}

		function parseEffectNewparam( xml, data ) {

			var sid = xml.getAttribute( 'sid' );

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'surface':
						data.surfaces[ sid ] = parseEffectSurface( child );
						break;

					case 'sampler2D':
						data.samplers[ sid ] = parseEffectSampler( child );
						break;

				}

			}

		}

		function parseEffectSurface( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'init_from':
						data.init_from = child.textContent;
						break;

				}

			}

			return data;

		}

		function parseEffectSampler( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'source':
						data.source = child.textContent;
						break;

				}

			}

			return data;

		}

		function parseEffectTechnique( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'constant':
					case 'lambert':
					case 'blinn':
					case 'phong':
						data.type = child.nodeName;
						data.parameters = parseEffectParameters( child );
						break;

				}

			}

			return data;

		}

		function parseEffectParameters( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'emission':
					case 'diffuse':
					case 'specular':
					case 'shininess':
					case 'transparency':
						data[ child.nodeName ] = parseEffectParameter( child );
						break;
					case 'transparent':
						data[ child.nodeName ] = {
							opaque: child.getAttribute( 'opaque' ),
							data: parseEffectParameter( child )
						};
						break;

				}

			}

			return data;

		}

		function parseEffectParameter( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'color':
						data[ child.nodeName ] = parseFloats( child.textContent );
						break;

					case 'float':
						data[ child.nodeName ] = parseFloat( child.textContent );
						break;

					case 'texture':
						data[ child.nodeName ] = { id: child.getAttribute( 'texture' ), extra: parseEffectParameterTexture( child ) };
						break;

				}

			}

			return data;

		}

		function parseEffectParameterTexture( xml ) {

			var data = {
				technique: {}
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'extra':
						parseEffectParameterTextureExtra( child, data );
						break;

				}

			}

			return data;

		}

		function parseEffectParameterTextureExtra( xml, data ) {

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'technique':
						parseEffectParameterTextureExtraTechnique( child, data );
						break;

				}

			}

		}

		function parseEffectParameterTextureExtraTechnique( xml, data ) {

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'repeatU':
					case 'repeatV':
					case 'offsetU':
					case 'offsetV':
						data.technique[ child.nodeName ] = parseFloat( child.textContent );
						break;

					case 'wrapU':
					case 'wrapV':

						// some files have values for wrapU/wrapV which become NaN via parseInt

						if ( child.textContent.toUpperCase() === 'TRUE' ) {

							data.technique[ child.nodeName ] = 1;

						} else if ( child.textContent.toUpperCase() === 'FALSE' ) {

							data.technique[ child.nodeName ] = 0;

						} else {

							data.technique[ child.nodeName ] = parseInt( child.textContent );

						}

						break;

				}

			}

		}

		function parseEffectExtra( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'technique':
						data.technique = parseEffectExtraTechnique( child );
						break;

				}

			}

			return data;

		}

		function parseEffectExtraTechnique( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'double_sided':
						data[ child.nodeName ] = parseInt( child.textContent );
						break;

				}

			}

			return data;

		}

		function buildEffect( data ) {

			return data;

		}

		function getEffect( id ) {

			return getBuild( library.effects[ id ], buildEffect );

		}

		// material

		function parseMaterial( xml ) {

			var data = {
				name: xml.getAttribute( 'name' )
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'instance_effect':
						data.url = parseId( child.getAttribute( 'url' ) );
						break;

				}

			}

			library.materials[ xml.getAttribute( 'id' ) ] = data;

		}

		function buildMaterial( data ) {

			var effect = getEffect( data.url );
			var technique = effect.profile.technique;
			var extra = effect.profile.extra;

			var material;

			switch ( technique.type ) {

				case 'phong':
				case 'blinn':
					material = new THREE.MeshPhongMaterial();
					break;

				case 'lambert':
					material = new THREE.MeshLambertMaterial();
					break;

				default:
					material = new THREE.MeshBasicMaterial();
					break;

			}

			material.name = data.name;

			function getTexture( textureObject ) {

				var sampler = effect.profile.samplers[ textureObject.id ];
				var image;

				// get image

				if ( sampler !== undefined ) {

					var surface = effect.profile.surfaces[ sampler.source ];
					image = getImage( surface.init_from );

				} else {

					console.warn( 'THREE.ColladaLoader: Undefined sampler. Access image directly (see #12530).' );
					image = getImage( textureObject.id );

				}

				// create texture if image is avaiable

				if ( image !== undefined ) {

					var texture = textureLoader.load( image );

					var extra = textureObject.extra;

					if ( extra !== undefined && extra.technique !== undefined && isEmpty( extra.technique ) === false ) {

						var technique = extra.technique;

						texture.wrapS = technique.wrapU ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
						texture.wrapT = technique.wrapV ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;

						texture.offset.set( technique.offsetU || 0, technique.offsetV || 0 );
						texture.repeat.set( technique.repeatU || 1, technique.repeatV || 1 );

					} else {

						texture.wrapS = THREE.RepeatWrapping;
						texture.wrapT = THREE.RepeatWrapping;

					}

					return texture;

				} else {

					console.error( 'THREE.ColladaLoader: Unable to load texture with ID:', textureObject.id );

					return null;

				}

			}

			var parameters = technique.parameters;

			for ( var key in parameters ) {

				var parameter = parameters[ key ];

				switch ( key ) {

					case 'diffuse':
						if ( parameter.color ) material.color.fromArray( parameter.color );
						if ( parameter.texture ) material.map = getTexture( parameter.texture );
						break;
					case 'specular':
						if ( parameter.color && material.specular ) material.specular.fromArray( parameter.color );
						if ( parameter.texture ) material.specularMap = getTexture( parameter.texture );
						break;
					case 'shininess':
						if ( parameter.float && material.shininess )
							material.shininess = parameter.float;
						break;
					case 'emission':
						if ( parameter.color && material.emissive )
							material.emissive.fromArray( parameter.color );
						break;

				}

			}

			//

			var transparent = parameters[ 'transparent' ];
			var transparency = parameters[ 'transparency' ];

			// <transparency> does not exist but <transparent>

			if ( transparency === undefined && transparent ) {

				transparency = {
					float: 1
				};

			}

			// <transparent> does not exist but <transparency>

			if ( transparent === undefined && transparency ) {

				transparent = {
					opaque: 'A_ONE',
					data: {
						color: [ 1, 1, 1, 1 ]
					} };

			}

			if ( transparent && transparency ) {

				// handle case if a texture exists but no color

				if ( transparent.data.texture ) {

					material.alphaMap = getTexture( transparent.data.texture );
					material.transparent = true;

				} else {

					var color = transparent.data.color;

					switch ( transparent.opaque ) {

						case 'A_ONE':
							material.opacity = color[ 3 ] * transparency.float;
							break;
						case 'RGB_ZERO':
							material.opacity = 1 - ( color[ 0 ] * transparency.float );
							break;
						case 'A_ZERO':
							material.opacity = 1 - ( color[ 3 ] * transparency.float );
							break;
						case 'RGB_ONE':
							material.opacity = color[ 0 ] * transparency.float;
							break;
						default:
							console.warn( 'THREE.ColladaLoader: Invalid opaque type "%s" of transparent tag.', transparent.opaque );

					}

					if ( material.opacity < 1 ) material.transparent = true;

				}

			}

			//

			if ( extra !== undefined && extra.technique !== undefined && extra.technique.double_sided === 1 ) {

				material.side = THREE.DoubleSide;

			}

			return material;

		}

		function getMaterial( id ) {

			return getBuild( library.materials[ id ], buildMaterial );

		}

		// camera

		function parseCamera( xml ) {

			var data = {
				name: xml.getAttribute( 'name' )
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'optics':
						data.optics = parseCameraOptics( child );
						break;

				}

			}

			library.cameras[ xml.getAttribute( 'id' ) ] = data;

		}

		function parseCameraOptics( xml ) {

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				switch ( child.nodeName ) {

					case 'technique_common':
						return parseCameraTechnique( child );

				}

			}

			return {};

		}

		function parseCameraTechnique( xml ) {

			var data = {};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				switch ( child.nodeName ) {

					case 'perspective':
					case 'orthographic':

						data.technique = child.nodeName;
						data.parameters = parseCameraParameters( child );

						break;

				}

			}

			return data;

		}

		function parseCameraParameters( xml ) {

			var data = {};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				switch ( child.nodeName ) {

					case 'xfov':
					case 'yfov':
					case 'xmag':
					case 'ymag':
					case 'znear':
					case 'zfar':
					case 'aspect_ratio':
						data[ child.nodeName ] = parseFloat( child.textContent );
						break;

				}

			}

			return data;

		}

		function buildCamera( data ) {

			var camera;

			switch ( data.optics.technique ) {

				case 'perspective':
					camera = new THREE.PerspectiveCamera(
						data.optics.parameters.yfov,
						data.optics.parameters.aspect_ratio,
						data.optics.parameters.znear,
						data.optics.parameters.zfar
					);
					break;

				case 'orthographic':
					var ymag = data.optics.parameters.ymag;
					var xmag = data.optics.parameters.xmag;
					var aspectRatio = data.optics.parameters.aspect_ratio;

					xmag = ( xmag === undefined ) ? ( ymag * aspectRatio ) : xmag;
					ymag = ( ymag === undefined ) ? ( xmag / aspectRatio ) : ymag;

					xmag *= 0.5;
					ymag *= 0.5;

					camera = new THREE.OrthographicCamera(
						- xmag, xmag, ymag, - ymag, // left, right, top, bottom
						data.optics.parameters.znear,
						data.optics.parameters.zfar
					);
					break;

				default:
					camera = new THREE.PerspectiveCamera();
					break;

			}

			camera.name = data.name;

			return camera;

		}

		function getCamera( id ) {

			var data = library.cameras[ id ];

			if ( data !== undefined ) {

				return getBuild( data, buildCamera );

			}

			console.warn( 'THREE.ColladaLoader: Couldn\'t find camera with ID:', id );

			return null;

		}

		// light

		function parseLight( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'technique_common':
						data = parseLightTechnique( child );
						break;

				}

			}

			library.lights[ xml.getAttribute( 'id' ) ] = data;

		}

		function parseLightTechnique( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'directional':
					case 'point':
					case 'spot':
					case 'ambient':

						data.technique = child.nodeName;
						data.parameters = parseLightParameters( child );

				}

			}

			return data;

		}

		function parseLightParameters( xml ) {

			var data = {};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'color':
						var array = parseFloats( child.textContent );
						data.color = new THREE.Color().fromArray( array );
						break;

					case 'falloff_angle':
						data.falloffAngle = parseFloat( child.textContent );
						break;

					case 'quadratic_attenuation':
						var f = parseFloat( child.textContent );
						data.distance = f ? Math.sqrt( 1 / f ) : 0;
						break;

				}

			}

			return data;

		}

		function buildLight( data ) {

			var light;

			switch ( data.technique ) {

				case 'directional':
					light = new THREE.DirectionalLight();
					break;

				case 'point':
					light = new THREE.PointLight();
					break;

				case 'spot':
					light = new THREE.SpotLight();
					break;

				case 'ambient':
					light = new THREE.AmbientLight();
					break;

			}

			if ( data.parameters.color ) light.color.copy( data.parameters.color );
			if ( data.parameters.distance ) light.distance = data.parameters.distance;

			return light;

		}

		function getLight( id ) {

			var data = library.lights[ id ];

			if ( data !== undefined ) {

				return getBuild( data, buildLight );

			}

			console.warn( 'THREE.ColladaLoader: Couldn\'t find light with ID:', id );

			return null;

		}

		// geometry

		function parseGeometry( xml ) {

			var data = {
				name: xml.getAttribute( 'name' ),
				sources: {},
				vertices: {},
				primitives: []
			};

			var mesh = getElementsByTagName( xml, 'mesh' )[ 0 ];

			// the following tags inside geometry are not supported yet (see https://github.com/mrdoob/three.js/pull/12606): convex_mesh, spline, brep
			if ( mesh === undefined ) return;

			for ( var i = 0; i < mesh.childNodes.length; i ++ ) {

				var child = mesh.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				var id = child.getAttribute( 'id' );

				switch ( child.nodeName ) {

					case 'source':
						data.sources[ id ] = parseSource( child );
						break;

					case 'vertices':
						// data.sources[ id ] = data.sources[ parseId( getElementsByTagName( child, 'input' )[ 0 ].getAttribute( 'source' ) ) ];
						data.vertices = parseGeometryVertices( child );
						break;

					case 'polygons':
						console.warn( 'THREE.ColladaLoader: Unsupported primitive type: ', child.nodeName );
						break;

					case 'lines':
					case 'linestrips':
					case 'polylist':
					case 'triangles':
						data.primitives.push( parseGeometryPrimitive( child ) );
						break;

					default:
						console.log( child );

				}

			}

			library.geometries[ xml.getAttribute( 'id' ) ] = data;

		}

		function parseSource( xml ) {

			var data = {
				array: [],
				stride: 3
			};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'float_array':
						data.array = parseFloats( child.textContent );
						break;

					case 'Name_array':
						data.array = parseStrings( child.textContent );
						break;

					case 'technique_common':
						var accessor = getElementsByTagName( child, 'accessor' )[ 0 ];

						if ( accessor !== undefined ) {

							data.stride = parseInt( accessor.getAttribute( 'stride' ) );

						}
						break;

				}

			}

			return data;

		}

		function parseGeometryVertices( xml ) {

			var data = {};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				data[ child.getAttribute( 'semantic' ) ] = parseId( child.getAttribute( 'source' ) );

			}

			return data;

		}

		function parseGeometryPrimitive( xml ) {

			var primitive = {
				type: xml.nodeName,
				material: xml.getAttribute( 'material' ),
				count: parseInt( xml.getAttribute( 'count' ) ),
				inputs: {},
				stride: 0,
				hasUV: false
			};

			for ( var i = 0, l = xml.childNodes.length; i < l; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'input':
						var id = parseId( child.getAttribute( 'source' ) );
						var semantic = child.getAttribute( 'semantic' );
						var offset = parseInt( child.getAttribute( 'offset' ) );
						primitive.inputs[ semantic ] = { id: id, offset: offset };
						primitive.stride = Math.max( primitive.stride, offset + 1 );
						if ( semantic === 'TEXCOORD' ) primitive.hasUV = true;
						break;

					case 'vcount':
						primitive.vcount = parseInts( child.textContent );
						break;

					case 'p':
						primitive.p = parseInts( child.textContent );
						break;

				}

			}

			return primitive;

		}

		function groupPrimitives( primitives ) {

			var build = {};

			for ( var i = 0; i < primitives.length; i ++ ) {

				var primitive = primitives[ i ];

				if ( build[ primitive.type ] === undefined ) build[ primitive.type ] = [];

				build[ primitive.type ].push( primitive );

			}

			return build;

		}

		function checkUVCoordinates( primitives ) {

			var count = 0;

			for ( var i = 0, l = primitives.length; i < l; i ++ ) {

				var primitive = primitives[ i ];

				if ( primitive.hasUV === true ) {

					count ++;

				}

			}

			if ( count > 0 && count < primitives.length ) {

				primitives.uvsNeedsFix = true;

			}

		}

		function buildGeometry( data ) {

			var build = {};

			var sources = data.sources;
			var vertices = data.vertices;
			var primitives = data.primitives;

			if ( primitives.length === 0 ) return {};

			// our goal is to create one buffer geometry for a single type of primitives
			// first, we group all primitives by their type

			var groupedPrimitives = groupPrimitives( primitives );

			for ( var type in groupedPrimitives ) {

				var primitiveType = groupedPrimitives[ type ];

				// second, ensure consistent uv coordinates for each type of primitives (polylist,triangles or lines)

				checkUVCoordinates( primitiveType );

				// third, create a buffer geometry for each type of primitives

				build[ type ] = buildGeometryType( primitiveType, sources, vertices );

			}

			return build;

		}

		function buildGeometryType( primitives, sources, vertices ) {

			var build = {};

			var position = { array: [], stride: 0 };
			var normal = { array: [], stride: 0 };
			var uv = { array: [], stride: 0 };
			var color = { array: [], stride: 0 };

			var skinIndex = { array: [], stride: 4 };
			var skinWeight = { array: [], stride: 4 };

			var geometry = new THREE.BufferGeometry();

			var materialKeys = [];

			var start = 0, count = 0;

			for ( var p = 0; p < primitives.length; p ++ ) {

				var primitive = primitives[ p ];
				var inputs = primitive.inputs;
				var triangleCount = 1;

				if ( primitive.vcount && primitive.vcount[ 0 ] === 4 ) {

					triangleCount = 2; // one quad -> two triangles

				}

				// groups

				if ( primitive.type === 'lines' || primitive.type === 'linestrips' ) {

					count = primitive.count * 2;

				} else {

					count = primitive.count * 3 * triangleCount;

				}

				geometry.addGroup( start, count, p );
				start += count;

				// material

				if ( primitive.material ) {

					materialKeys.push( primitive.material );

				}

				// geometry data

				for ( var name in inputs ) {

					var input = inputs[ name ];

					switch ( name )	{

						case 'VERTEX':
							for ( var key in vertices ) {

								var id = vertices[ key ];

								switch ( key ) {

									case 'POSITION':
										var prevLength = position.array.length;
										buildGeometryData( primitive, sources[ id ], input.offset, position.array );
										position.stride = sources[ id ].stride;

										if ( sources.skinWeights && sources.skinIndices ) {

											buildGeometryData( primitive, sources.skinIndices, input.offset, skinIndex.array );
											buildGeometryData( primitive, sources.skinWeights, input.offset, skinWeight.array );

										}

										// see #3803

										if ( primitive.hasUV === false && primitives.uvsNeedsFix === true ) {

											var count = ( position.array.length - prevLength ) / position.stride;

											for ( var i = 0; i < count; i ++ ) {

												// fill missing uv coordinates

												uv.array.push( 0, 0 );

											}

										}
										break;

									case 'NORMAL':
										buildGeometryData( primitive, sources[ id ], input.offset, normal.array );
										normal.stride = sources[ id ].stride;
										break;

									case 'COLOR':
										buildGeometryData( primitive, sources[ id ], input.offset, color.array );
										color.stride = sources[ id ].stride;
										break;

									case 'TEXCOORD':
										buildGeometryData( primitive, sources[ id ], input.offset, uv.array );
										uv.stride = sources[ id ].stride;
										break;

									default:
										console.warn( 'THREE.ColladaLoader: Semantic "%s" not handled in geometry build process.', key );

								}

							}
							break;

						case 'NORMAL':
							buildGeometryData( primitive, sources[ input.id ], input.offset, normal.array );
							normal.stride = sources[ input.id ].stride;
							break;

						case 'COLOR':
							buildGeometryData( primitive, sources[ input.id ], input.offset, color.array );
							color.stride = sources[ input.id ].stride;
							break;

						case 'TEXCOORD':
							buildGeometryData( primitive, sources[ input.id ], input.offset, uv.array );
							uv.stride = sources[ input.id ].stride;
							break;

					}

				}

			}

			// build geometry

			if ( position.array.length > 0 ) geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( position.array, position.stride ) );
			if ( normal.array.length > 0 ) geometry.addAttribute( 'normal', new THREE.Float32BufferAttribute( normal.array, normal.stride ) );
			if ( color.array.length > 0 ) geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( color.array, color.stride ) );
			if ( uv.array.length > 0 ) geometry.addAttribute( 'uv', new THREE.Float32BufferAttribute( uv.array, uv.stride ) );

			if ( skinIndex.array.length > 0 ) geometry.addAttribute( 'skinIndex', new THREE.Float32BufferAttribute( skinIndex.array, skinIndex.stride ) );
			if ( skinWeight.array.length > 0 ) geometry.addAttribute( 'skinWeight', new THREE.Float32BufferAttribute( skinWeight.array, skinWeight.stride ) );

			build.data = geometry;
			build.type = primitives[ 0 ].type;
			build.materialKeys = materialKeys;

			return build;

		}

		function buildGeometryData( primitive, source, offset, array ) {

			var indices = primitive.p;
			var stride = primitive.stride;
			var vcount = primitive.vcount;

			function pushVector( i ) {

				var index = indices[ i + offset ] * sourceStride;
				var length = index + sourceStride;

				for ( ; index < length; index ++ ) {

					array.push( sourceArray[ index ] );

				}

			}

			var maxcount = 0;

			var sourceArray = source.array;
			var sourceStride = source.stride;

			if ( primitive.vcount !== undefined ) {

				var index = 0;

				for ( var i = 0, l = vcount.length; i < l; i ++ ) {

					var count = vcount[ i ];

					if ( count === 4 ) {

						var a = index + stride * 0;
						var b = index + stride * 1;
						var c = index + stride * 2;
						var d = index + stride * 3;

						pushVector( a ); pushVector( b ); pushVector( d );
						pushVector( b ); pushVector( c ); pushVector( d );

					} else if ( count === 3 ) {

						var a = index + stride * 0;
						var b = index + stride * 1;
						var c = index + stride * 2;

						pushVector( a ); pushVector( b ); pushVector( c );

					} else {

						maxcount = Math.max( maxcount, count );

					}

					index += stride * count;

				}

				if ( maxcount > 0 ) {

					console.log( 'THREE.ColladaLoader: Geometry has faces with more than 4 vertices.' );

				}

			} else {

				for ( var i = 0, l = indices.length; i < l; i += stride ) {

					pushVector( i );

				}

			}

		}

		function getGeometry( id ) {

			return getBuild( library.geometries[ id ], buildGeometry );

		}

		// kinematics

		function parseKinematicsModel( xml ) {

			var data = {
				name: xml.getAttribute( 'name' ) || '',
				joints: {},
				links: []
			};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'technique_common':
						parseKinematicsTechniqueCommon( child, data );
						break;

				}

			}

			library.kinematicsModels[ xml.getAttribute( 'id' ) ] = data;

		}

		function buildKinematicsModel( data ) {

			if ( data.build !== undefined ) return data.build;

			return data;

		}

		function getKinematicsModel( id ) {

			return getBuild( library.kinematicsModels[ id ], buildKinematicsModel );

		}

		function parseKinematicsTechniqueCommon( xml, data ) {

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'joint':
						data.joints[ child.getAttribute( 'sid' ) ] = parseKinematicsJoint( child );
						break;

					case 'link':
						data.links.push( parseKinematicsLink( child ) );
						break;

				}

			}

		}

		function parseKinematicsJoint( xml ) {

			var data;

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'prismatic':
					case 'revolute':
						data = parseKinematicsJointParameter( child );
						break;

				}

			}

			return data;

		}

		function parseKinematicsJointParameter( xml, data ) {

			var data = {
				sid: xml.getAttribute( 'sid' ),
				name: xml.getAttribute( 'name' ) || '',
				axis: new THREE.Vector3(),
				limits: {
					min: 0,
					max: 0
				},
				type: xml.nodeName,
				static: false,
				zeroPosition: 0,
				middlePosition: 0
			};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'axis':
						var array = parseFloats( child.textContent );
						data.axis.fromArray( array );
						break;
					case 'limits':
						var max = child.getElementsByTagName( 'max' )[ 0 ];
						var min = child.getElementsByTagName( 'min' )[ 0 ];

						data.limits.max = parseFloat( max.textContent );
						data.limits.min = parseFloat( min.textContent );
						break;

				}

			}

			// if min is equal to or greater than max, consider the joint static

			if ( data.limits.min >= data.limits.max ) {

				data.static = true;

			}

			// calculate middle position

			data.middlePosition = ( data.limits.min + data.limits.max ) / 2.0;

			return data;

		}

		function parseKinematicsLink( xml ) {

			var data = {
				sid: xml.getAttribute( 'sid' ),
				name: xml.getAttribute( 'name' ) || '',
				attachments: [],
				transforms: []
			};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'attachment_full':
						data.attachments.push( parseKinematicsAttachment( child ) );
						break;

					case 'matrix':
					case 'translate':
					case 'rotate':
						data.transforms.push( parseKinematicsTransform( child ) );
						break;

				}

			}

			return data;

		}

		function parseKinematicsAttachment( xml ) {

			var data = {
				joint: xml.getAttribute( 'joint' ).split( '/' ).pop(),
				transforms: [],
				links: []
			};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'link':
						data.links.push( parseKinematicsLink( child ) );
						break;

					case 'matrix':
					case 'translate':
					case 'rotate':
						data.transforms.push( parseKinematicsTransform( child ) );
						break;

				}

			}

			return data;

		}

		function parseKinematicsTransform( xml ) {

			var data = {
				type: xml.nodeName
			};

			var array = parseFloats( xml.textContent );

			switch ( data.type ) {

				case 'matrix':
					data.obj = new THREE.Matrix4();
					data.obj.fromArray( array ).transpose();
					break;

				case 'translate':
					data.obj = new THREE.Vector3();
					data.obj.fromArray( array );
					break;

				case 'rotate':
					data.obj = new THREE.Vector3();
					data.obj.fromArray( array );
					data.angle = THREE.Math.degToRad( array[ 3 ] );
					break;

			}

			return data;

		}

		function parseKinematicsScene( xml ) {

			var data = {
				bindJointAxis: []
			};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'bind_joint_axis':
						data.bindJointAxis.push( parseKinematicsBindJointAxis( child ) );
						break;

				}

			}

			library.kinematicsScenes[ parseId( xml.getAttribute( 'url' ) ) ] = data;

		}

		function parseKinematicsBindJointAxis( xml ) {

			var data = {
				target: xml.getAttribute( 'target' ).split( '/' ).pop()
			};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'axis':
						var param = child.getElementsByTagName( 'param' )[ 0 ];
						data.axis = param.textContent;
						var tmpJointIndex = data.axis.split( 'inst_' ).pop().split( 'axis' )[ 0 ];
						data.jointIndex = tmpJointIndex.substr( 0, tmpJointIndex.length - 1 );
						break;

				}

			}

			return data;

		}

		function buildKinematicsScene( data ) {

			if ( data.build !== undefined ) return data.build;

			return data;

		}

		function getKinematicsScene( id ) {

			return getBuild( library.kinematicsScenes[ id ], buildKinematicsScene );

		}

		function setupKinematics() {

			var kinematicsModelId = Object.keys( library.kinematicsModels )[ 0 ];
			var kinematicsSceneId = Object.keys( library.kinematicsScenes )[ 0 ];
			var visualSceneId = Object.keys( library.visualScenes )[ 0 ];

			if ( kinematicsModelId === undefined || kinematicsSceneId === undefined ) return;

			var kinematicsModel = getKinematicsModel( kinematicsModelId );
			var kinematicsScene = getKinematicsScene( kinematicsSceneId );
			var visualScene = getVisualScene( visualSceneId );

			var bindJointAxis = kinematicsScene.bindJointAxis;
			var jointMap = {};

			for ( var i = 0, l = bindJointAxis.length; i < l; i ++ ) {

				var axis = bindJointAxis[ i ];

				// the result of the following query is an element of type 'translate', 'rotate','scale' or 'matrix'

				var targetElement = collada.querySelector( '[sid="' + axis.target + '"]' );

				if ( targetElement ) {

					// get the parent of the transfrom element

					var parentVisualElement = targetElement.parentElement;

					// connect the joint of the kinematics model with the element in the visual scene

					connect( axis.jointIndex, parentVisualElement );

				}

			}

			function connect( jointIndex, visualElement ) {

				var visualElementName = visualElement.getAttribute( 'name' );
				var joint = kinematicsModel.joints[ jointIndex ];

				visualScene.traverse( function ( object ) {

					if ( object.name === visualElementName ) {

						jointMap[ jointIndex ] = {
							object: object,
							transforms: buildTransformList( visualElement ),
							joint: joint,
							position: joint.zeroPosition
						};

					}

				} );

			}

			var m0 = new THREE.Matrix4();

			kinematics = {

				joints: kinematicsModel && kinematicsModel.joints,

				getJointValue: function ( jointIndex ) {

					var jointData = jointMap[ jointIndex ];

					if ( jointData ) {

						return jointData.position;

					} else {

						console.warn( 'THREE.ColladaLoader: Joint ' + jointIndex + ' doesn\'t exist.' );

					}

				},

				setJointValue: function ( jointIndex, value ) {

					var jointData = jointMap[ jointIndex ];

					if ( jointData ) {

						var joint = jointData.joint;

						if ( value > joint.limits.max || value < joint.limits.min ) {

							console.warn( 'THREE.ColladaLoader: Joint ' + jointIndex + ' value ' + value + ' outside of limits (min: ' + joint.limits.min + ', max: ' + joint.limits.max + ').' );

						} else if ( joint.static ) {

							console.warn( 'THREE.ColladaLoader: Joint ' + jointIndex + ' is static.' );

						} else {

							var object = jointData.object;
							var axis = joint.axis;
							var transforms = jointData.transforms;

							matrix.identity();

							// each update, we have to apply all transforms in the correct order

							for ( var i = 0; i < transforms.length; i ++ ) {

								var transform = transforms[ i ];

								// if there is a connection of the transform node with a joint, apply the joint value

								if ( transform.sid && transform.sid.indexOf( jointIndex ) !== - 1 ) {

									switch ( joint.type ) {

										case 'revolute':
											matrix.multiply( m0.makeRotationAxis( axis, THREE.Math.degToRad( value ) ) );
											break;

										case 'prismatic':
											matrix.multiply( m0.makeTranslation( axis.x * value, axis.y * value, axis.z * value ) );
											break;

										default:
											console.warn( 'THREE.ColladaLoader: Unknown joint type: ' + joint.type );
											break;

									}

								} else {

									switch ( transform.type ) {

										case 'matrix':
											matrix.multiply( transform.obj );
											break;

										case 'translate':
											matrix.multiply( m0.makeTranslation( transform.obj.x, transform.obj.y, transform.obj.z ) );
											break;

										case 'scale':
											matrix.scale( transform.obj );
											break;

										case 'rotate':
											matrix.multiply( m0.makeRotationAxis( transform.obj, transform.angle ) );
											break;

									}

								}

							}

							object.matrix.copy( matrix );
							object.matrix.decompose( object.position, object.quaternion, object.scale );

							jointMap[ jointIndex ].position = value;

						}

					} else {

						console.log( 'THREE.ColladaLoader: ' + jointIndex + ' does not exist.' );

					}

				}

			};

		}

		function buildTransformList( node ) {

			var transforms = [];

			var xml = collada.querySelector( '[id="' + node.id + '"]' );

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'matrix':
						var array = parseFloats( child.textContent );
						var matrix = new THREE.Matrix4().fromArray( array ).transpose();
						transforms.push( {
							sid: child.getAttribute( 'sid' ),
							type: child.nodeName,
							obj: matrix
						} );
						break;

					case 'translate':
					case 'scale':
						var array = parseFloats( child.textContent );
						var vector = new THREE.Vector3().fromArray( array );
						transforms.push( {
							sid: child.getAttribute( 'sid' ),
							type: child.nodeName,
							obj: vector
						} );
						break;

					case 'rotate':
						var array = parseFloats( child.textContent );
						var vector = new THREE.Vector3().fromArray( array );
						var angle = THREE.Math.degToRad( array[ 3 ] );
						transforms.push( {
							sid: child.getAttribute( 'sid' ),
							type: child.nodeName,
							obj: vector,
							angle: angle
						} );
						break;

				}

			}

			return transforms;

		}

		// nodes

		function prepareNodes( xml ) {

			var elements = xml.getElementsByTagName( 'node' );

			// ensure all node elements have id attributes

			for ( var i = 0; i < elements.length; i ++ ) {

				var element = elements[ i ];

				if ( element.hasAttribute( 'id' ) === false ) {

					element.setAttribute( 'id', generateId() );

				}

			}

		}

		var matrix = new THREE.Matrix4();
		var vector = new THREE.Vector3();

		function parseNode( xml ) {

			var data = {
				name: xml.getAttribute( 'name' ) || '',
				type: xml.getAttribute( 'type' ),
				id: xml.getAttribute( 'id' ),
				sid: xml.getAttribute( 'sid' ),
				matrix: new THREE.Matrix4(),
				nodes: [],
				instanceCameras: [],
				instanceControllers: [],
				instanceLights: [],
				instanceGeometries: [],
				instanceNodes: [],
				transforms: {}
			};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				if ( child.nodeType !== 1 ) continue;

				switch ( child.nodeName ) {

					case 'node':
						data.nodes.push( child.getAttribute( 'id' ) );
						parseNode( child );
						break;

					case 'instance_camera':
						data.instanceCameras.push( parseId( child.getAttribute( 'url' ) ) );
						break;

					case 'instance_controller':
						data.instanceControllers.push( parseNodeInstance( child ) );
						break;

					case 'instance_light':
						data.instanceLights.push( parseId( child.getAttribute( 'url' ) ) );
						break;

					case 'instance_geometry':
						data.instanceGeometries.push( parseNodeInstance( child ) );
						break;

					case 'instance_node':
						data.instanceNodes.push( parseId( child.getAttribute( 'url' ) ) );
						break;

					case 'matrix':
						var array = parseFloats( child.textContent );
						data.matrix.multiply( matrix.fromArray( array ).transpose() );
						data.transforms[ child.getAttribute( 'sid' ) ] = child.nodeName;
						break;

					case 'translate':
						var array = parseFloats( child.textContent );
						vector.fromArray( array );
						data.matrix.multiply( matrix.makeTranslation( vector.x, vector.y, vector.z ) );
						data.transforms[ child.getAttribute( 'sid' ) ] = child.nodeName;
						break;

					case 'rotate':
						var array = parseFloats( child.textContent );
						var angle = THREE.Math.degToRad( array[ 3 ] );
						data.matrix.multiply( matrix.makeRotationAxis( vector.fromArray( array ), angle ) );
						data.transforms[ child.getAttribute( 'sid' ) ] = child.nodeName;
						break;

					case 'scale':
						var array = parseFloats( child.textContent );
						data.matrix.scale( vector.fromArray( array ) );
						data.transforms[ child.getAttribute( 'sid' ) ] = child.nodeName;
						break;

					case 'extra':
						break;

					default:
						console.log( child );

				}

			}

			library.nodes[ data.id ] = data;

			return data;

		}

		function parseNodeInstance( xml ) {

			var data = {
				id: parseId( xml.getAttribute( 'url' ) ),
				materials: {},
				skeletons: []
			};

			for ( var i = 0; i < xml.childNodes.length; i ++ ) {

				var child = xml.childNodes[ i ];

				switch ( child.nodeName ) {

					case 'bind_material':
						var instances = child.getElementsByTagName( 'instance_material' );

						for ( var j = 0; j < instances.length; j ++ ) {

							var instance = instances[ j ];
							var symbol = instance.getAttribute( 'symbol' );
							var target = instance.getAttribute( 'target' );

							data.materials[ symbol ] = parseId( target );

						}

						break;

					case 'skeleton':
						data.skeletons.push( parseId( child.textContent ) );
						break;

					default:
						break;

				}

			}

			return data;

		}

		function buildSkeleton( skeletons, joints ) {

			var boneData = [];
			var sortedBoneData = [];

			var i, j, data;

			// a skeleton can have multiple root bones. collada expresses this
			// situtation with multiple "skeleton" tags per controller instance

			for ( i = 0; i < skeletons.length; i ++ ) {

				var skeleton = skeletons[ i ];

				var root;

				if ( hasNode( skeleton ) ) {

					root = getNode( skeleton );
					buildBoneHierarchy( root, joints, boneData );

				} else if ( hasVisualScene( skeleton ) ) {

					// handle case where the skeleton refers to the visual scene (#13335)

					var visualScene = library.visualScenes[ skeleton ];
					var children = visualScene.children;

					for ( var j = 0; j < children.length; j ++ ) {

						var child = children[ j ];

						if ( child.type === 'JOINT' ) {

							var root = getNode( child.id );
							buildBoneHierarchy( root, joints, boneData );

						}

					}

				} else {

					console.error( 'THREE.ColladaLoader: Unable to find root bone of skeleton with ID:', skeleton );

				}

			}

			// sort bone data (the order is defined in the corresponding controller)

			for ( i = 0; i < joints.length; i ++ ) {

				for ( j = 0; j < boneData.length; j ++ ) {

					data = boneData[ j ];

					if ( data.bone.name === joints[ i ].name ) {

						sortedBoneData[ i ] = data;
						data.processed = true;
						break;

					}

				}

			}

			// add unprocessed bone data at the end of the list

			for ( i = 0; i < boneData.length; i ++ ) {

				data = boneData[ i ];

				if ( data.processed === false ) {

					sortedBoneData.push( data );
					data.processed = true;

				}

			}

			// setup arrays for skeleton creation

			var bones = [];
			var boneInverses = [];

			for ( i = 0; i < sortedBoneData.length; i ++ ) {

				data = sortedBoneData[ i ];

				bones.push( data.bone );
				boneInverses.push( data.boneInverse );

			}

			return new THREE.Skeleton( bones, boneInverses );

		}

		function buildBoneHierarchy( root, joints, boneData ) {

			// setup bone data from visual scene

			root.traverse( function ( object ) {

				if ( object.isBone === true ) {

					var boneInverse;

					// retrieve the boneInverse from the controller data

					for ( var i = 0; i < joints.length; i ++ ) {

						var joint = joints[ i ];

						if ( joint.name === object.name ) {

							boneInverse = joint.boneInverse;
							break;

						}

					}

					if ( boneInverse === undefined ) {

						// Unfortunately, there can be joints in the visual scene that are not part of the
						// corresponding controller. In this case, we have to create a dummy boneInverse matrix
						// for the respective bone. This bone won't affect any vertices, because there are no skin indices
						// and weights defined for it. But we still have to add the bone to the sorted bone list in order to
						// ensure a correct animation of the model.

						 boneInverse = new THREE.Matrix4();

					}

					boneData.push( { bone: object, boneInverse: boneInverse, processed: false } );

				}

			} );

		}

		function buildNode( data ) {

			var objects = [];

			var matrix = data.matrix;
			var nodes = data.nodes;
			var type = data.type;
			var instanceCameras = data.instanceCameras;
			var instanceControllers = data.instanceControllers;
			var instanceLights = data.instanceLights;
			var instanceGeometries = data.instanceGeometries;
			var instanceNodes = data.instanceNodes;

			// nodes

			for ( var i = 0, l = nodes.length; i < l; i ++ ) {

				objects.push( getNode( nodes[ i ] ) );

			}

			// instance cameras

			for ( var i = 0, l = instanceCameras.length; i < l; i ++ ) {

				var instanceCamera = getCamera( instanceCameras[ i ] );

				if ( instanceCamera !== null ) {

					objects.push( instanceCamera.clone() );

				}

			}

			// instance controllers

			for ( var i = 0, l = instanceControllers.length; i < l; i ++ ) {

				var instance = instanceControllers[ i ];
				var controller = getController( instance.id );
				var geometries = getGeometry( controller.id );
				var newObjects = buildObjects( geometries, instance.materials );

				var skeletons = instance.skeletons;
				var joints = controller.skin.joints;

				var skeleton = buildSkeleton( skeletons, joints );

				for ( var j = 0, jl = newObjects.length; j < jl; j ++ ) {

					var object = newObjects[ j ];

					if ( object.isSkinnedMesh ) {

						object.bind( skeleton, controller.skin.bindMatrix );
						object.normalizeSkinWeights();

					}

					objects.push( object );

				}

			}

			// instance lights

			for ( var i = 0, l = instanceLights.length; i < l; i ++ ) {

				var instanceLight = getLight( instanceLights[ i ] );

				if ( instanceLight !== null ) {

					objects.push( instanceLight.clone() );

				}

			}

			// instance geometries

			for ( var i = 0, l = instanceGeometries.length; i < l; i ++ ) {

				var instance = instanceGeometries[ i ];

				// a single geometry instance in collada can lead to multiple object3Ds.
				// this is the case when primitives are combined like triangles and lines

				var geometries = getGeometry( instance.id );
				var newObjects = buildObjects( geometries, instance.materials );

				for ( var j = 0, jl = newObjects.length; j < jl; j ++ ) {

					objects.push( newObjects[ j ] );

				}

			}

			// instance nodes

			for ( var i = 0, l = instanceNodes.length; i < l; i ++ ) {

				objects.push( getNode( instanceNodes[ i ] ).clone() );

			}

			var object;

			if ( nodes.length === 0 && objects.length === 1 ) {

				object = objects[ 0 ];

			} else {

				object = ( type === 'JOINT' ) ? new THREE.Bone() : new THREE.Group();

				for ( var i = 0; i < objects.length; i ++ ) {

					object.add( objects[ i ] );

				}

			}

			if ( object.name === '' ) {

				object.name = ( type === 'JOINT' ) ? data.sid : data.name;

			}

			object.matrix.copy( matrix );
			object.matrix.decompose( object.position, object.quaternion, object.scale );

			return object;

		}

		function resolveMaterialBinding( keys, instanceMaterials ) {

			var materials = [];

			for ( var i = 0, l = keys.length; i < l; i ++ ) {

				var id = instanceMaterials[ keys[ i ] ];
				materials.push( getMaterial( id ) );

			}

			return materials;

		}

		function buildObjects( geometries, instanceMaterials ) {

			var objects = [];

			for ( var type in geometries ) {

				var geometry = geometries[ type ];

				var materials = resolveMaterialBinding( geometry.materialKeys, instanceMaterials );

				// handle case if no materials are defined

				if ( materials.length === 0 ) {

					if ( type === 'lines' || type === 'linestrips' ) {

						materials.push( new THREE.LineBasicMaterial() );

					} else {

						materials.push( new THREE.MeshPhongMaterial() );

					}

				}

				// regard skinning

				var skinning = ( geometry.data.attributes.skinIndex !== undefined );

				if ( skinning ) {

					for ( var i = 0, l = materials.length; i < l; i ++ ) {

						materials[ i ].skinning = true;

					}

				}

				// choose between a single or multi materials (material array)

				var material = ( materials.length === 1 ) ? materials[ 0 ] : materials;

				// now create a specific 3D object

				var object;

				switch ( type ) {

					case 'lines':
						object = new THREE.LineSegments( geometry.data, material );
						break;

					case 'linestrips':
						object = new THREE.Line( geometry.data, material );
						break;

					case 'triangles':
					case 'polylist':
						if ( skinning ) {

							object = new THREE.SkinnedMesh( geometry.data, material );

						} else {

							object = new THREE.Mesh( geometry.data, material );

						}
						break;

				}

				objects.push( object );

			}

			return objects;

		}

		function hasNode( id ) {

			return library.nodes[ id ] !== undefined;

		}

		function getNode( id ) {

			return getBuild( library.nodes[ id ], buildNode );

		}

		// visual scenes

		function parseVisualScene( xml ) {

			var data = {
				name: xml.getAttribute( 'name' ),
				children: []
			};

			prepareNodes( xml );

			var elements = getElementsByTagName( xml, 'node' );

			for ( var i = 0; i < elements.length; i ++ ) {

				data.children.push( parseNode( elements[ i ] ) );

			}

			library.visualScenes[ xml.getAttribute( 'id' ) ] = data;

		}

		function buildVisualScene( data ) {

			var group = new THREE.Group();
			group.name = data.name;

			var children = data.children;

			for ( var i = 0; i < children.length; i ++ ) {

				var child = children[ i ];

				group.add( getNode( child.id ) );

			}

			return group;

		}

		function hasVisualScene( id ) {

			return library.visualScenes[ id ] !== undefined;

		}

		function getVisualScene( id ) {

			return getBuild( library.visualScenes[ id ], buildVisualScene );

		}

		// scenes

		function parseScene( xml ) {

			var instance = getElementsByTagName( xml, 'instance_visual_scene' )[ 0 ];
			return getVisualScene( parseId( instance.getAttribute( 'url' ) ) );

		}

		function setupAnimations() {

			var clips = library.clips;

			if ( isEmpty( clips ) === true ) {

				if ( isEmpty( library.animations ) === false ) {

					// if there are animations but no clips, we create a default clip for playback

					var tracks = [];

					for ( var id in library.animations ) {

						var animationTracks = getAnimation( id );

						for ( var i = 0, l = animationTracks.length; i < l; i ++ ) {

							tracks.push( animationTracks[ i ] );

						}

					}

					animations.push( new THREE.AnimationClip( 'default', - 1, tracks ) );

				}

			} else {

				for ( var id in clips ) {

					animations.push( getAnimationClip( id ) );

				}

			}

		}

		console.time( 'THREE.ColladaLoader' );

		if ( text.length === 0 ) {

			return { scene: new THREE.Scene() };

		}

		console.time( 'THREE.ColladaLoader: DOMParser' );

		var xml = new DOMParser().parseFromString( text, 'application/xml' );

		console.timeEnd( 'THREE.ColladaLoader: DOMParser' );

		var collada = getElementsByTagName( xml, 'COLLADA' )[ 0 ];

		// metadata

		var version = collada.getAttribute( 'version' );
		console.log( 'THREE.ColladaLoader: File version', version );

		var asset = parseAsset( getElementsByTagName( collada, 'asset' )[ 0 ] );
		var textureLoader = new THREE.TextureLoader( this.manager );
		textureLoader.setPath( path ).setCrossOrigin( this.crossOrigin );

		//

		var animations = [];
		var kinematics = {};
		var count = 0;

		//

		var library = {
			animations: {},
			clips: {},
			controllers: {},
			images: {},
			effects: {},
			materials: {},
			cameras: {},
			lights: {},
			geometries: {},
			nodes: {},
			visualScenes: {},
			kinematicsModels: {},
			kinematicsScenes: {}
		};

		console.time( 'THREE.ColladaLoader: Parse' );

		parseLibrary( collada, 'library_animations', 'animation', parseAnimation );
		parseLibrary( collada, 'library_animation_clips', 'animation_clip', parseAnimationClip );
		parseLibrary( collada, 'library_controllers', 'controller', parseController );
		parseLibrary( collada, 'library_images', 'image', parseImage );
		parseLibrary( collada, 'library_effects', 'effect', parseEffect );
		parseLibrary( collada, 'library_materials', 'material', parseMaterial );
		parseLibrary( collada, 'library_cameras', 'camera', parseCamera );
		parseLibrary( collada, 'library_lights', 'light', parseLight );
		parseLibrary( collada, 'library_geometries', 'geometry', parseGeometry );
		parseLibrary( collada, 'library_nodes', 'node', parseNode );
		parseLibrary( collada, 'library_visual_scenes', 'visual_scene', parseVisualScene );
		parseLibrary( collada, 'library_kinematics_models', 'kinematics_model', parseKinematicsModel );
		parseLibrary( collada, 'scene', 'instance_kinematics_scene', parseKinematicsScene );

		console.timeEnd( 'THREE.ColladaLoader: Parse' );

		console.time( 'THREE.ColladaLoader: Build' );

		buildLibrary( library.animations, buildAnimation );
		buildLibrary( library.clips, buildAnimationClip );
		buildLibrary( library.controllers, buildController );
		buildLibrary( library.images, buildImage );
		buildLibrary( library.effects, buildEffect );
		buildLibrary( library.materials, buildMaterial );
		buildLibrary( library.cameras, buildCamera );
		buildLibrary( library.lights, buildLight );
		buildLibrary( library.geometries, buildGeometry );
		buildLibrary( library.visualScenes, buildVisualScene );

		console.timeEnd( 'THREE.ColladaLoader: Build' );

		setupAnimations();
		setupKinematics();

		var scene = parseScene( getElementsByTagName( collada, 'scene' )[ 0 ] );

		if ( asset.upAxis === 'Z_UP' ) {

			scene.quaternion.setFromEuler( new THREE.Euler( - Math.PI / 2, 0, 0 ) );

		}

		scene.scale.multiplyScalar( asset.unit );

		console.timeEnd( 'THREE.ColladaLoader' );

		return {
			animations: animations,
			kinematics: kinematics,
			library: library,
			scene: scene
		};

	}

};

 return THREE.ColladaLoader;
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define('ColladaLoader',["three", "vendor/three/loaders/ColladaLoader", "lodash"], function( THREE, ThreeColladaLoader, _ ){
    var ColladaLoader = function ()
    {
        ThreeColladaLoader.call( this );
    };

    ColladaLoader.prototype = _.create( ThreeColladaLoader.prototype, {
        constructor : ColladaLoader,
        
        load : function(url, onLoad, onProgress, onError)
        {
            var scope = this;
            var path = scope.path === undefined ? THREE.LoaderUtils.extractUrlBase( url ) : scope.path;
            
            onLoad = onLoad || function(){};
            
            if( url === null || url === undefined || url === "" ) {
                onLoad( null );
            };

            require(["text!" + url], function ( responseText ) {
                
                var fnc = onLoad || function(){};
                fnc ( scope.parse( responseText, path ) );
                
            }, onError);
        }
        
    });

    return ColladaLoader;
});


define('LoaderSupport',["three"], function(THREE){
/**
  * @author Kai Salmen / https://kaisalmen.de
  * Development repository: https://github.com/kaisalmen/WWOBJLoader
  */



if ( THREE.LoaderSupport === undefined ) { THREE.LoaderSupport = {} }

/**
 * Validation functions.
 * @class
 */
THREE.LoaderSupport.Validator = {
	/**
	 * If given input is null or undefined, false is returned otherwise true.
	 *
	 * @param input Can be anything
	 * @returns {boolean}
	 */
	isValid: function( input ) {
		return ( input !== null && input !== undefined );
	},
	/**
	 * If given input is null or undefined, the defaultValue is returned otherwise the given input.
	 *
	 * @param input Can be anything
	 * @param defaultValue Can be anything
	 * @returns {*}
	 */
	verifyInput: function( input, defaultValue ) {
		return ( input === null || input === undefined ) ? defaultValue : input;
	}
};


/**
 * Callbacks utilized by loaders and builders.
 * @class
 */
THREE.LoaderSupport.Callbacks = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function Callbacks() {
		this.onProgress = null;
		this.onMeshAlter = null;
		this.onLoad = null;
		this.onLoadMaterials = null;
	}

	/**
	 * Register callback function that is invoked by internal function "announceProgress" to print feedback.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnProgress Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnProgress = function ( callbackOnProgress ) {
		this.onProgress = Validator.verifyInput( callbackOnProgress, this.onProgress );
	};

	/**
	 * Register callback function that is called every time a mesh was loaded.
	 * Use {@link THREE.LoaderSupport.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnMeshAlter Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnMeshAlter = function ( callbackOnMeshAlter ) {
		this.onMeshAlter = Validator.verifyInput( callbackOnMeshAlter, this.onMeshAlter );
	};

	/**
	 * Register callback function that is called once loading of the complete OBJ file is completed.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnLoad Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnLoad = function ( callbackOnLoad ) {
		this.onLoad = Validator.verifyInput( callbackOnLoad, this.onLoad );
	};

	/**
	 * Register callback function that is called when materials have been loaded.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnLoadMaterials Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnLoadMaterials = function ( callbackOnLoadMaterials ) {
		this.onLoadMaterials = Validator.verifyInput( callbackOnLoadMaterials, this.onLoadMaterials );
	};

	return Callbacks;
})();


/**
 * Object to return by callback onMeshAlter. Used to disregard a certain mesh or to return one to many meshes.
 * @class
 *
 * @param {boolean} disregardMesh=false Tell implementation to completely disregard this mesh
 * @param {boolean} disregardMesh=false Tell implementation that mesh(es) have been altered or added
 */
THREE.LoaderSupport.LoadedMeshUserOverride = (function () {

	function LoadedMeshUserOverride( disregardMesh, alteredMesh ) {
		this.disregardMesh = disregardMesh === true;
		this.alteredMesh = alteredMesh === true;
		this.meshes = [];
	}

	/**
	 * Add a mesh created within callback.
	 *
	 * @memberOf THREE.OBJLoader2.LoadedMeshUserOverride
	 *
	 * @param {THREE.Mesh} mesh
	 */
	LoadedMeshUserOverride.prototype.addMesh = function ( mesh ) {
		this.meshes.push( mesh );
		this.alteredMesh = true;
	};

	/**
	 * Answers if mesh shall be disregarded completely.
	 *
	 * @returns {boolean}
	 */
	LoadedMeshUserOverride.prototype.isDisregardMesh = function () {
		return this.disregardMesh;
	};

	/**
	 * Answers if new mesh(es) were created.
	 *
	 * @returns {boolean}
	 */
	LoadedMeshUserOverride.prototype.providesAlteredMeshes = function () {
		return this.alteredMesh;
	};

	return LoadedMeshUserOverride;
})();


/**
 * A resource description used by {@link THREE.LoaderSupport.PrepData} and others.
 * @class
 *
 * @param {string} url URL to the file
 * @param {string} extension The file extension (type)
 */
THREE.LoaderSupport.ResourceDescriptor = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function ResourceDescriptor( url, extension ) {
		var urlParts = url.split( '/' );

		if ( urlParts.length < 2 ) {

			this.path = null;
			this.name = url;
			this.url = url;

		} else {

			this.path = Validator.verifyInput( urlParts.slice( 0, urlParts.length - 1).join( '/' ) + '/', null );
			this.name = Validator.verifyInput( urlParts[ urlParts.length - 1 ], null );
			this.url = url;

		}
		this.extension = Validator.verifyInput( extension, "default" );
		this.extension = this.extension.trim();
		this.content = null;
	}

	/**
	 * Set the content of this resource
	 * @memberOf THREE.LoaderSupport.ResourceDescriptor
	 *
	 * @param {Object} content The file content as arraybuffer or text
	 */
	ResourceDescriptor.prototype.setContent = function ( content ) {
		this.content = Validator.verifyInput( content, null );
	};

	return ResourceDescriptor;
})();


/**
 * Configuration instructions to be used by run method.
 * @class
 */
THREE.LoaderSupport.PrepData = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function PrepData( modelName ) {
		this.logging = {
			enabled: true,
			debug: false
		};
		this.modelName = Validator.verifyInput( modelName, '' );
		this.resources = [];
		this.callbacks = new THREE.LoaderSupport.Callbacks();
	}

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	PrepData.prototype.setLogging = function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
	};

	/**
	 * Returns all callbacks as {@link THREE.LoaderSupport.Callbacks}
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @returns {THREE.LoaderSupport.Callbacks}
	 */
	PrepData.prototype.getCallbacks = function () {
		return this.callbacks;
	};

	/**
	 * Add a resource description.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {THREE.LoaderSupport.ResourceDescriptor} Adds a {@link THREE.LoaderSupport.ResourceDescriptor}
	 */
	PrepData.prototype.addResource = function ( resource ) {
		this.resources.push( resource );
	};

	/**
	 * Clones this object and returns it afterwards. Callbacks and resources are not cloned deep (references!).
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @returns {@link THREE.LoaderSupport.PrepData}
	 */
	PrepData.prototype.clone = function () {
		var clone = new THREE.LoaderSupport.PrepData( this.modelName );
		clone.logging.enabled = this.logging.enabled;
		clone.logging.debug = this.logging.debug;
		clone.resources = this.resources;
		clone.callbacks = this.callbacks;

		var property, value;
		for ( property in this ) {

			value = this[ property ];
			if ( ! clone.hasOwnProperty( property ) && typeof this[ property ] !== 'function' ) {

				clone[ property ] = value;

			}
		}

		return clone;
	};


	/**
	 * Identify files or content of interest from an Array of {@link THREE.LoaderSupport.ResourceDescriptor}.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {THREE.LoaderSupport.ResourceDescriptor[]} resources Array of {@link THREE.LoaderSupport.ResourceDescriptor}
	 * @param Object fileDesc Object describing which resources are of interest (ext, type (string or UInt8Array) and ignore (boolean))
	 * @returns {{}} Object with each "ext" and the corresponding {@link THREE.LoaderSupport.ResourceDescriptor}
	 */
	PrepData.prototype.checkResourceDescriptorFiles = function ( resources, fileDesc ) {
		var resource, triple, i, found;
		var result = {};

		for ( var index in resources ) {

			resource = resources[ index ];
			found = false;
			if ( ! Validator.isValid( resource.name ) ) continue;
			if ( Validator.isValid( resource.content ) ) {

				for ( i = 0; i < fileDesc.length && !found; i++ ) {

					triple = fileDesc[ i ];
					if ( resource.extension.toLowerCase() === triple.ext.toLowerCase() ) {

						if ( triple.ignore ) {

							found = true;

						} else if ( triple.type === "ArrayBuffer" ) {

							// fast-fail on bad type
							if ( ! ( resource.content instanceof ArrayBuffer || resource.content instanceof Uint8Array ) ) throw 'Provided content is not of type ArrayBuffer! Aborting...';
							result[ triple.ext ] = resource;
							found = true;

						} else if ( triple.type === "String" ) {

							if ( ! ( typeof( resource.content ) === 'string' || resource.content instanceof String) ) throw 'Provided  content is not of type String! Aborting...';
							result[ triple.ext ] = resource;
							found = true;

						}

					}

				}
				if ( !found ) throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

			} else {

				// fast-fail on bad type
				if ( ! ( typeof( resource.name ) === 'string' || resource.name instanceof String ) ) throw 'Provided file is not properly defined! Aborting...';
				for ( i = 0; i < fileDesc.length && !found; i++ ) {

					triple = fileDesc[ i ];
					if ( resource.extension.toLowerCase() === triple.ext.toLowerCase() ) {

						if ( ! triple.ignore ) result[ triple.ext ] = resource;
						found = true;

					}

				}
				if ( !found ) throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

			}
		}

		return result;
	};

	return PrepData;
})();

/**
 * Builds one or many THREE.Mesh from one raw set of Arraybuffers, materialGroup descriptions and further parameters.
 * Supports vertex, vertexColor, normal, uv and index buffers.
 * @class
 */
THREE.LoaderSupport.MeshBuilder = (function () {

	var LOADER_MESH_BUILDER_VERSION = '1.2.0';

	var Validator = THREE.LoaderSupport.Validator;

	function MeshBuilder() {
		console.info( 'Using THREE.LoaderSupport.MeshBuilder version: ' + LOADER_MESH_BUILDER_VERSION );
		this.logging = {
			enabled: true,
			debug: false
		};

		this.callbacks = new THREE.LoaderSupport.Callbacks();
		this.materials = [];
	}

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 * @memberOf THREE.LoaderSupport.MeshBuilder
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	MeshBuilder.prototype.setLogging = function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
	};

	/**
	 * Initializes the MeshBuilder (currently only default material initialisation).
	 * @memberOf THREE.LoaderSupport.MeshBuilder
	 *
	 */
	MeshBuilder.prototype.init = function () {
		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';

		var defaultVertexColorMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultVertexColorMaterial.name = 'defaultVertexColorMaterial';
		defaultVertexColorMaterial.vertexColors = THREE.VertexColors;

		var defaultLineMaterial = new THREE.LineBasicMaterial();
		defaultLineMaterial.name = 'defaultLineMaterial';

		var defaultPointMaterial = new THREE.PointsMaterial( { size: 1 } );
		defaultPointMaterial.name = 'defaultPointMaterial';

		var runtimeMaterials = {};
		runtimeMaterials[ defaultMaterial.name ] = defaultMaterial;
		runtimeMaterials[ defaultVertexColorMaterial.name ] = defaultVertexColorMaterial;
		runtimeMaterials[ defaultLineMaterial.name ] = defaultLineMaterial;
		runtimeMaterials[ defaultPointMaterial.name ] = defaultPointMaterial;

		this.updateMaterials(
			{
				cmd: 'materialData',
				materials: {
					materialCloneInstructions: null,
					serializedMaterials: null,
					runtimeMaterials: runtimeMaterials
				}
			}
		);
	};

	/**
	 * Set materials loaded by any supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.LoaderSupport.MeshBuilder
	 *
	 * @param {THREE.Material[]} materials Array of {@link THREE.Material}
	 */
	MeshBuilder.prototype.setMaterials = function ( materials ) {
		var payload = {
			cmd: 'materialData',
			materials: {
				materialCloneInstructions: null,
				serializedMaterials: null,
				runtimeMaterials: Validator.isValid( this.callbacks.onLoadMaterials ) ? this.callbacks.onLoadMaterials( materials ) : materials
			}
		};
		this.updateMaterials( payload );
	};

	MeshBuilder.prototype._setCallbacks = function ( callbacks ) {
		if ( Validator.isValid( callbacks.onProgress ) ) this.callbacks.setCallbackOnProgress( callbacks.onProgress );
		if ( Validator.isValid( callbacks.onMeshAlter ) ) this.callbacks.setCallbackOnMeshAlter( callbacks.onMeshAlter );
		if ( Validator.isValid( callbacks.onLoad ) ) this.callbacks.setCallbackOnLoad( callbacks.onLoad );
		if ( Validator.isValid( callbacks.onLoadMaterials ) ) this.callbacks.setCallbackOnLoadMaterials( callbacks.onLoadMaterials );
	};

	/**
	 * Delegates processing of the payload (mesh building or material update) to the corresponding functions (BW-compatibility).
	 * @memberOf THREE.LoaderSupport.MeshBuilder
	 *
	 * @param {Object} payload Raw Mesh or Material descriptions.
	 * @returns {THREE.Mesh[]} mesh Array of {@link THREE.Mesh} or null in case of material update
	 */
	MeshBuilder.prototype.processPayload = function ( payload ) {
		if ( payload.cmd === 'meshData' ) {

			return this.buildMeshes( payload );

		} else if ( payload.cmd === 'materialData' ) {

			this.updateMaterials( payload );
			return null;

		}
	};

	/**
	 * Builds one or multiple meshes from the data described in the payload (buffers, params, material info).
	 * @memberOf THREE.LoaderSupport.MeshBuilder
	 *
	 * @param {Object} meshPayload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 * @returns {THREE.Mesh[]} mesh Array of {@link THREE.Mesh}
	 */
	MeshBuilder.prototype.buildMeshes = function ( meshPayload ) {
		var meshName = meshPayload.params.meshName;

		var bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.vertices ), 3 ) );
		if ( Validator.isValid( meshPayload.buffers.indices ) ) {

			bufferGeometry.setIndex( new THREE.BufferAttribute( new Uint32Array( meshPayload.buffers.indices ), 1 ));

		}
		var haveVertexColors = Validator.isValid( meshPayload.buffers.colors );
		if ( haveVertexColors ) {

			bufferGeometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.colors ), 3 ) );

		}
		if ( Validator.isValid( meshPayload.buffers.normals ) ) {

			bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.normals ), 3 ) );

		} else {

			bufferGeometry.computeVertexNormals();

		}
		if ( Validator.isValid( meshPayload.buffers.uvs ) ) {

			bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.uvs ), 2 ) );

		}

		var material, materialName, key;
		var materialNames = meshPayload.materials.materialNames;
		var createMultiMaterial = meshPayload.materials.multiMaterial;
		var multiMaterials = [];
		for ( key in materialNames ) {

			materialName = materialNames[ key ];
			material = this.materials[ materialName ];
			if ( createMultiMaterial ) multiMaterials.push( material );

		}
		if ( createMultiMaterial ) {

			material = multiMaterials;
			var materialGroups = meshPayload.materials.materialGroups;
			var materialGroup;
			for ( key in materialGroups ) {

				materialGroup = materialGroups[ key ];
				bufferGeometry.addGroup( materialGroup.start, materialGroup.count, materialGroup.index );

			}

		}

		var meshes = [];
		var mesh;
		var callbackOnMeshAlter = this.callbacks.onMeshAlter;
		var callbackOnMeshAlterResult;
		var useOrgMesh = true;
		var geometryType = Validator.verifyInput( meshPayload.geometryType, 0 );
		if ( Validator.isValid( callbackOnMeshAlter ) ) {

			callbackOnMeshAlterResult = callbackOnMeshAlter(
				{
					detail: {
						meshName: meshName,
						bufferGeometry: bufferGeometry,
						material: material,
						geometryType: geometryType
					}
				}
			);
			if ( Validator.isValid( callbackOnMeshAlterResult ) ) {

				if ( ! callbackOnMeshAlterResult.isDisregardMesh() && callbackOnMeshAlterResult.providesAlteredMeshes() ) {

					for ( var i in callbackOnMeshAlterResult.meshes ) {

						meshes.push( callbackOnMeshAlterResult.meshes[ i ] );

					}

				}
				useOrgMesh = false;

			}

		}
		if ( useOrgMesh ) {

			if ( meshPayload.computeBoundingSphere ) bufferGeometry.computeBoundingSphere();
			if ( geometryType === 0 ) {

				mesh = new THREE.Mesh( bufferGeometry, material );

			} else if ( geometryType === 1) {

				mesh = new THREE.LineSegments( bufferGeometry, material );

			} else {

				mesh = new THREE.Points( bufferGeometry, material );

			}
			mesh.name = meshName;
			meshes.push( mesh );

		}

		var progressMessage;
		if ( Validator.isValid( meshes ) && meshes.length > 0 ) {

			var meshNames = [];
			for ( var i in meshes ) {

				mesh = meshes[ i ];
				meshNames[ i ] = mesh.name;

			}
			progressMessage = 'Adding mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh: ' + meshName;
			progressMessage += ' (' + ( meshPayload.progress.numericalValue * 100 ).toFixed( 2 ) + '%)';

		} else {

			progressMessage = 'Not adding mesh: ' + meshName;
			progressMessage += ' (' + ( meshPayload.progress.numericalValue * 100 ).toFixed( 2 ) + '%)';

		}
		var callbackOnProgress = this.callbacks.onProgress;
		if ( Validator.isValid( callbackOnProgress ) ) {

			var event = new CustomEvent( 'MeshBuilderEvent', {
				detail: {
					type: 'progress',
					modelName: meshPayload.params.meshName,
					text: progressMessage,
					numericalValue: meshPayload.progress.numericalValue
				}
			} );
			callbackOnProgress( event );

		}

		return meshes;
	};

	/**
	 * Updates the materials with contained material objects (sync) or from alteration instructions (async).
	 * @memberOf THREE.LoaderSupport.MeshBuilder
	 *
	 * @param {Object} materialPayload Material update instructions
	 */
	MeshBuilder.prototype.updateMaterials = function ( materialPayload ) {
		var material, materialName;
		var materialCloneInstructions = materialPayload.materials.materialCloneInstructions;
		if ( Validator.isValid( materialCloneInstructions ) ) {

			var materialNameOrg = materialCloneInstructions.materialNameOrg;
			var materialOrg = this.materials[ materialNameOrg ];

			if ( Validator.isValid( materialNameOrg ) ) {

				material = materialOrg.clone();

				materialName = materialCloneInstructions.materialName;
				material.name = materialName;

				var materialProperties = materialCloneInstructions.materialProperties;
				for ( var key in materialProperties ) {

					if ( material.hasOwnProperty( key ) && materialProperties.hasOwnProperty( key ) ) material[ key ] = materialProperties[ key ];

				}
				this.materials[ materialName ] = material;

			} else {

				console.warn( 'Requested material "' + materialNameOrg + '" is not available!' );

			}
		}

		var materials = materialPayload.materials.serializedMaterials;
		if ( Validator.isValid( materials ) && Object.keys( materials ).length > 0 ) {

			var loader = new THREE.MaterialLoader();
			var materialJson;
			for ( materialName in materials ) {

				materialJson = materials[ materialName ];
				if ( Validator.isValid( materialJson ) ) {

					material = loader.parse( materialJson );
					if ( this.logging.enabled ) console.info( 'De-serialized material with name "' + materialName + '" will be added.' );
					this.materials[ materialName ] = material;
				}

			}

		}

		materials = materialPayload.materials.runtimeMaterials;
		if ( Validator.isValid( materials ) && Object.keys( materials ).length > 0 ) {

			for ( materialName in materials ) {

				material = materials[ materialName ];
				if ( this.logging.enabled ) console.info( 'Material with name "' + materialName + '" will be added.' );
				this.materials[ materialName ] = material;

			}

		}
	};

	/**
	 * Returns the mapping object of material name and corresponding jsonified material.
	 *
	 * @returns {Object} Map of Materials in JSON representation
	 */
	MeshBuilder.prototype.getMaterialsJSON = function () {
		var materialsJSON = {};
		var material;
		for ( var materialName in this.materials ) {

			material = this.materials[ materialName ];
			materialsJSON[ materialName ] = material.toJSON();
		}

		return materialsJSON;
	};

	/**
	 * Returns the mapping object of material name and corresponding material.
	 *
	 * @returns {Object} Map of {@link THREE.Material}
	 */
	MeshBuilder.prototype.getMaterials = function () {
		return this.materials;
	};

	return MeshBuilder;
})();

/**
 * Default implementation of the WorkerRunner responsible for creation and configuration of the parser within the worker.
 *
 * @class
 */
THREE.LoaderSupport.WorkerRunnerRefImpl = (function () {

	function WorkerRunnerRefImpl() {
		var scope = this;
		var scopedRunner = function( event ) {
			scope.processMessage( event.data );
		};
		self.addEventListener( 'message', scopedRunner, false );
	}

	/**
	 * Applies values from parameter object via set functions or via direct assignment.
	 * @memberOf THREE.LoaderSupport.WorkerRunnerRefImpl
	 *
	 * @param {Object} parser The parser instance
	 * @param {Object} params The parameter object
	 */
	WorkerRunnerRefImpl.prototype.applyProperties = function ( parser, params ) {
		var property, funcName, values;
		for ( property in params ) {
			funcName = 'set' + property.substring( 0, 1 ).toLocaleUpperCase() + property.substring( 1 );
			values = params[ property ];

			if ( typeof parser[ funcName ] === 'function' ) {

				parser[ funcName ]( values );

			} else if ( parser.hasOwnProperty( property ) ) {

				parser[ property ] = values;

			}
		}
	};

	/**
	 * Configures the Parser implementation according the supplied configuration object.
	 * @memberOf THREE.LoaderSupport.WorkerRunnerRefImpl
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	WorkerRunnerRefImpl.prototype.processMessage = function ( payload ) {
		if ( payload.cmd === 'run' ) {

			var callbacks = {
				callbackMeshBuilder: function ( payload ) {
					self.postMessage( payload );
				},
				callbackProgress: function ( text ) {
					if ( payload.logging.enabled && payload.logging.debug ) console.debug( 'WorkerRunner: progress: ' + text );
				}
			};

			// Parser is expected to be named as such
			var parser = new Parser();
			if ( typeof parser[ 'setLogging' ] === 'function' ) parser.setLogging( payload.logging.enabled, payload.logging.debug );
			this.applyProperties( parser, payload.params );
			this.applyProperties( parser, payload.materials );
			this.applyProperties( parser, callbacks );
			parser.workerScope = self;
			parser.parse( payload.data.input, payload.data.options );

			if ( payload.logging.enabled ) console.log( 'WorkerRunner: Run complete!' );

			callbacks.callbackMeshBuilder( {
				cmd: 'complete',
				msg: 'WorkerRunner completed run.'
			} );

		} else {

			console.error( 'WorkerRunner: Received unknown command: ' + payload.cmd );

		}
	};

	return WorkerRunnerRefImpl;
})();

/**
 * This class provides means to transform existing parser code into a web worker. It defines a simple communication protocol
 * which allows to configure the worker and receive raw mesh data during execution.
 * @class
 */
THREE.LoaderSupport.WorkerSupport = (function () {

	var WORKER_SUPPORT_VERSION = '2.2.0';

	var Validator = THREE.LoaderSupport.Validator;

	var LoaderWorker = (function () {

		function LoaderWorker() {
			this._reset();
		}

		LoaderWorker.prototype._reset = function () {
			this.logging = {
				enabled: true,
				debug: false
			};
			this.worker = null;
			this.runnerImplName = null;
			this.callbacks = {
				meshBuilder: null,
				onLoad: null
			};
			this.terminateRequested = false;
			this.queuedMessage = null;
			this.started = false;
			this.forceCopy = false;
		};

		LoaderWorker.prototype.setLogging = function ( enabled, debug ) {
			this.logging.enabled = enabled === true;
			this.logging.debug = debug === true;
		};

		LoaderWorker.prototype.setForceCopy = function ( forceCopy ) {
			this.forceCopy = forceCopy === true;
		};

		LoaderWorker.prototype.initWorker = function ( code, runnerImplName ) {
			this.runnerImplName = runnerImplName;
			var blob = new Blob( [ code ], { type: 'application/javascript' } );
			this.worker = new Worker( window.URL.createObjectURL( blob ) );
			this.worker.onmessage = this._receiveWorkerMessage;

			// set referemce to this, then processing in worker scope within "_receiveWorkerMessage" can access members
			this.worker.runtimeRef = this;

			// process stored queuedMessage
			this._postMessage();
		};

		/**
		 * Executed in worker scope
 		 */
		LoaderWorker.prototype._receiveWorkerMessage = function ( e ) {
			var payload = e.data;
			switch ( payload.cmd ) {
				case 'meshData':
				case 'materialData':
				case 'imageData':
					this.runtimeRef.callbacks.meshBuilder( payload );
					break;

				case 'complete':
					this.runtimeRef.queuedMessage = null;
					this.started = false;
					this.runtimeRef.callbacks.onLoad( payload.msg );

					if ( this.runtimeRef.terminateRequested ) {

						if ( this.runtimeRef.logging.enabled ) console.info( 'WorkerSupport [' + this.runtimeRef.runnerImplName + ']: Run is complete. Terminating application on request!' );
						this.runtimeRef._terminate();

					}
					break;

				case 'error':
					console.error( 'WorkerSupport [' + this.runtimeRef.runnerImplName + ']: Reported error: ' + payload.msg );
					this.runtimeRef.queuedMessage = null;
					this.started = false;
					this.runtimeRef.callbacks.onLoad( payload.msg );

					if ( this.runtimeRef.terminateRequested ) {

						if ( this.runtimeRef.logging.enabled ) console.info( 'WorkerSupport [' + this.runtimeRef.runnerImplName + ']: Run reported error. Terminating application on request!' );
						this.runtimeRef._terminate();

					}
					break;

				default:
					console.error( 'WorkerSupport [' + this.runtimeRef.runnerImplName + ']: Received unknown command: ' + payload.cmd );
					break;

			}
		};

		LoaderWorker.prototype.setCallbacks = function ( meshBuilder, onLoad ) {
			this.callbacks.meshBuilder = Validator.verifyInput( meshBuilder, this.callbacks.meshBuilder );
			this.callbacks.onLoad = Validator.verifyInput( onLoad, this.callbacks.onLoad );
		};

		LoaderWorker.prototype.run = function( payload ) {
			if ( Validator.isValid( this.queuedMessage ) ) {

				console.warn( 'Already processing message. Rejecting new run instruction' );
				return;

			} else {

				this.queuedMessage = payload;
				this.started = true;

			}
			if ( ! Validator.isValid( this.callbacks.meshBuilder ) ) throw 'Unable to run as no "MeshBuilder" callback is set.';
			if ( ! Validator.isValid( this.callbacks.onLoad ) ) throw 'Unable to run as no "onLoad" callback is set.';
			if ( payload.cmd !== 'run' ) payload.cmd = 'run';
			if ( Validator.isValid( payload.logging ) ) {

				payload.logging.enabled = payload.logging.enabled === true;
				payload.logging.debug = payload.logging.debug === true;

			} else {

				payload.logging = {
					enabled: true,
					debug: false
				}

			}
			this._postMessage();
		};

		LoaderWorker.prototype._postMessage = function () {
			if ( Validator.isValid( this.queuedMessage ) && Validator.isValid( this.worker ) ) {

				if ( this.queuedMessage.data.input instanceof ArrayBuffer ) {

					var content;
					if ( this.forceCopy ) {

						content = this.queuedMessage.data.input.slice( 0 );

					} else {

						content = this.queuedMessage.data.input;

					}
					this.worker.postMessage( this.queuedMessage, [ content ] );

				} else {

					this.worker.postMessage( this.queuedMessage );

				}

			}
		};

		LoaderWorker.prototype.setTerminateRequested = function ( terminateRequested ) {
			this.terminateRequested = terminateRequested === true;
			if ( this.terminateRequested && Validator.isValid( this.worker ) && ! Validator.isValid( this.queuedMessage ) && this.started ) {

				if ( this.logging.enabled ) console.info( 'Worker is terminated immediately as it is not running!' );
				this._terminate();

			}
		};

		LoaderWorker.prototype._terminate = function () {
			this.worker.terminate();
			this._reset();
		};

		return LoaderWorker;

	})();

	function WorkerSupport() {
		console.info( 'Using THREE.LoaderSupport.WorkerSupport version: ' + WORKER_SUPPORT_VERSION );
		this.logging = {
			enabled: true,
			debug: false
		};

		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";
		if ( window.Blob === undefined  ) throw "This browser does not support Blob!";
		if ( typeof window.URL.createObjectURL !== 'function'  ) throw "This browser does not support Object creation from URL!";

		this.loaderWorker = new LoaderWorker();
	}

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	WorkerSupport.prototype.setLogging = function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		this.loaderWorker.setLogging( this.logging.enabled, this.logging.debug );
	};

	/**
	 * Forces all ArrayBuffers to be transferred to worker to be copied.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {boolean} forceWorkerDataCopy True or false.
	 */
	WorkerSupport.prototype.setForceWorkerDataCopy = function ( forceWorkerDataCopy ) {
		this.loaderWorker.setForceCopy( forceWorkerDataCopy );
	};

	/**
	 * Validate the status of worker code and the derived worker.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {Function} functionCodeBuilder Function that is invoked with funcBuildObject and funcBuildSingleton that allows stringification of objects and singletons.
	 * @param {String} parserName Name of the Parser object
	 * @param {String[]} libLocations URL of libraries that shall be added to worker code relative to libPath
	 * @param {String} libPath Base path used for loading libraries
	 * @param {THREE.LoaderSupport.WorkerRunnerRefImpl} runnerImpl The default worker parser wrapper implementation (communication and execution). An extended class could be passed here.
	 */
	WorkerSupport.prototype.validate = function ( functionCodeBuilder, parserName, libLocations, libPath, runnerImpl ) {
		if ( Validator.isValid( this.loaderWorker.worker ) ) return;

		if ( this.logging.enabled ) {

			console.info( 'WorkerSupport: Building worker code...' );
			console.time( 'buildWebWorkerCode' );

		}
		if ( Validator.isValid( runnerImpl ) ) {

			if ( this.logging.enabled ) console.info( 'WorkerSupport: Using "' + runnerImpl.name + '" as Runner class for worker.' );

		} else {

			runnerImpl = THREE.LoaderSupport.WorkerRunnerRefImpl;
			if ( this.logging.enabled ) console.info( 'WorkerSupport: Using DEFAULT "THREE.LoaderSupport.WorkerRunnerRefImpl" as Runner class for worker.' );

		}

		var userWorkerCode = functionCodeBuilder( buildObject, buildSingleton );
		userWorkerCode += 'var Parser = '+ parserName +  ';\n\n';
		userWorkerCode += buildSingleton( runnerImpl.name, runnerImpl );
		userWorkerCode += 'new ' + runnerImpl.name + '();\n\n';

		var scope = this;
		if ( Validator.isValid( libLocations ) && libLocations.length > 0 ) {

			var libsContent = '';
			var loadAllLibraries = function ( path, locations ) {
				if ( locations.length === 0 ) {

					scope.loaderWorker.initWorker( libsContent + userWorkerCode, runnerImpl.name );
					if ( scope.logging.enabled ) console.timeEnd( 'buildWebWorkerCode' );

				} else {

					var loadedLib = function ( contentAsString ) {
						libsContent += contentAsString;
						loadAllLibraries( path, locations );
					};

					var fileLoader = new THREE.FileLoader();
					fileLoader.setPath( path );
					fileLoader.setResponseType( 'text' );
					fileLoader.load( locations[ 0 ], loadedLib );
					locations.shift();

				}
			};
			loadAllLibraries( libPath, libLocations );

		} else {

			this.loaderWorker.initWorker( userWorkerCode, runnerImpl.name );
			if ( this.logging.enabled ) console.timeEnd( 'buildWebWorkerCode' );

		}
	};

	/**
	 * Specify functions that should be build when new raw mesh data becomes available and when the parser is finished.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {Function} meshBuilder The mesh builder function. Default is {@link THREE.LoaderSupport.MeshBuilder}.
	 * @param {Function} onLoad The function that is called when parsing is complete.
	 */
	WorkerSupport.prototype.setCallbacks = function ( meshBuilder, onLoad ) {
		this.loaderWorker.setCallbacks( meshBuilder, onLoad );
	};

	/**
	 * Runs the parser with the provided configuration.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	WorkerSupport.prototype.run = function ( payload ) {
		this.loaderWorker.run( payload );
	};

	/**
	 * Request termination of worker once parser is finished.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {boolean} terminateRequested True or false.
	 */
	WorkerSupport.prototype.setTerminateRequested = function ( terminateRequested ) {
		this.loaderWorker.setTerminateRequested( terminateRequested );
	};

	var buildObject = function ( fullName, object ) {
		var objectString = fullName + ' = {\n';
		var part;
		for ( var name in object ) {

			part = object[ name ];
			if ( typeof( part ) === 'string' || part instanceof String ) {

				part = part.replace( '\n', '\\n' );
				part = part.replace( '\r', '\\r' );
				objectString += '\t' + name + ': "' + part + '",\n';

			} else if ( part instanceof Array ) {

				objectString += '\t' + name + ': [' + part + '],\n';

			} else if ( Number.isInteger( part ) ) {

				objectString += '\t' + name + ': ' + part + ',\n';

			} else if ( typeof part === 'function' ) {

				objectString += '\t' + name + ': ' + part + ',\n';

			}

		}
		objectString += '}\n\n';

		return objectString;
	};

	var buildSingleton = function ( fullName, object, internalName, basePrototypeName, ignoreFunctions ) {
		var objectString = '';
		var objectName = ( Validator.isValid( internalName ) ) ? internalName : object.name;

		var funcString, objectPart, constructorString;
		ignoreFunctions = Validator.verifyInput( ignoreFunctions, [] );
		for ( var name in object.prototype ) {

			objectPart = object.prototype[ name ];
			if ( name === 'constructor' ) {

				funcString = objectPart.toString();
				funcString = funcString.replace( 'function', '' );
				constructorString = '\tfunction ' + objectName + funcString + ';\n\n';

			} else if ( typeof objectPart === 'function' ) {

				if ( ignoreFunctions.indexOf( name ) < 0 ) {

					funcString = objectPart.toString();
					objectString += '\t' + objectName + '.prototype.' + name + ' = ' + funcString + ';\n\n';

				}

			}

		}
		objectString += '\treturn ' + objectName + ';\n';
		objectString += '})();\n\n';

		var inheritanceBlock = '';
		if ( Validator.isValid( basePrototypeName ) ) {

			inheritanceBlock += '\n';
			inheritanceBlock += objectName + '.prototype = Object.create( ' + basePrototypeName + '.prototype );\n';
			inheritanceBlock += objectName + '.constructor = ' + objectName + ';\n';
			inheritanceBlock += '\n';
		}
		if ( ! Validator.isValid( constructorString ) ) {

			constructorString = fullName + ' = (function () {\n\n';
			constructorString += inheritanceBlock + '\t' + object.prototype.constructor.toString() + '\n\n';
			objectString = constructorString + objectString;

		} else {

			objectString = fullName + ' = (function () {\n\n' + inheritanceBlock + constructorString + objectString;

		}

		return objectString;
	};

	return WorkerSupport;

})();

/**
 * Orchestrate loading of multiple OBJ files/data from an instruction queue with a configurable amount of workers (1-16).
 * Workflow:
 *   prepareWorkers
 *   enqueueForRun
 *   processQueue
 *   tearDown (to force stop)
 *
 * @class
 *
 * @param {string} classDef Class definition to be used for construction
 */
THREE.LoaderSupport.WorkerDirector = (function () {

	var LOADER_WORKER_DIRECTOR_VERSION = '2.2.0';

	var Validator = THREE.LoaderSupport.Validator;

	var MAX_WEB_WORKER = 16;
	var MAX_QUEUE_SIZE = 8192;

	function WorkerDirector( classDef ) {
		console.info( 'Using THREE.LoaderSupport.WorkerDirector version: ' + LOADER_WORKER_DIRECTOR_VERSION );
		this.logging = {
			enabled: true,
			debug: false
		};

		this.maxQueueSize = MAX_QUEUE_SIZE ;
		this.maxWebWorkers = MAX_WEB_WORKER;
		this.crossOrigin = null;

		if ( ! Validator.isValid( classDef ) ) throw 'Provided invalid classDef: ' + classDef;

		this.workerDescription = {
			classDef: classDef,
			globalCallbacks: {},
			workerSupports: {},
			forceWorkerDataCopy: true
		};
		this.objectsCompleted = 0;
		this.instructionQueue = [];
		this.instructionQueuePointer = 0;

		this.callbackOnFinishedProcessing = null;
	}

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	WorkerDirector.prototype.setLogging = function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
	};

	/**
	 * Returns the maximum length of the instruction queue.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @returns {number}
	 */
	WorkerDirector.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	/**
	 * Returns the maximum number of workers.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @returns {number}
	 */
	WorkerDirector.prototype.getMaxWebWorkers = function () {
		return this.maxWebWorkers;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {string} crossOrigin CORS value
	 */
	WorkerDirector.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Forces all ArrayBuffers to be transferred to worker to be copied.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {boolean} forceWorkerDataCopy True or false.
	 */
	WorkerDirector.prototype.setForceWorkerDataCopy = function ( forceWorkerDataCopy ) {
		this.workerDescription.forceWorkerDataCopy = forceWorkerDataCopy === true;
	};

	/**
	 * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks} globalCallbacks  Register global callbacks used by all web workers
	 * @param {number} maxQueueSize Set the maximum size of the instruction queue (1-1024)
	 * @param {number} maxWebWorkers Set the maximum amount of workers (1-16)
	 */
	WorkerDirector.prototype.prepareWorkers = function ( globalCallbacks, maxQueueSize, maxWebWorkers ) {
		if ( Validator.isValid( globalCallbacks ) ) this.workerDescription.globalCallbacks = globalCallbacks;
		this.maxQueueSize = Math.min( maxQueueSize, MAX_QUEUE_SIZE );
		this.maxWebWorkers = Math.min( maxWebWorkers, MAX_WEB_WORKER );
		this.maxWebWorkers = Math.min( this.maxWebWorkers, this.maxQueueSize );
		this.objectsCompleted = 0;
		this.instructionQueue = [];
		this.instructionQueuePointer = 0;

		for ( var instanceNo = 0; instanceNo < this.maxWebWorkers; instanceNo++ ) {

			var workerSupport = new THREE.LoaderSupport.WorkerSupport();
			workerSupport.setLogging( this.logging.enabled, this.logging.debug );
			workerSupport.setForceWorkerDataCopy( this.workerDescription.forceWorkerDataCopy );
			this.workerDescription.workerSupports[ instanceNo ] = {
				instanceNo: instanceNo,
				inUse: false,
				terminateRequested: false,
				workerSupport: workerSupport,
				loader: null
			};

		}
	};

	/**
	 * Store run instructions in internal instructionQueue.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {THREE.LoaderSupport.PrepData} prepData
	 */
	WorkerDirector.prototype.enqueueForRun = function ( prepData ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( prepData );
		}
	};

	/**
	 * Returns if any workers are running.
	 *
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 * @returns {boolean}
	 */
	WorkerDirector.prototype.isRunning = function () {
		var wsKeys = Object.keys( this.workerDescription.workerSupports );
		return ( ( this.instructionQueue.length > 0 && this.instructionQueuePointer < this.instructionQueue.length ) || wsKeys.length > 0 );
	};

	/**
	 * Process the instructionQueue until it is depleted.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 */
	WorkerDirector.prototype.processQueue = function () {
		var prepData, supportDesc;
		for ( var instanceNo in this.workerDescription.workerSupports ) {

			supportDesc = this.workerDescription.workerSupports[ instanceNo ];
			if ( ! supportDesc.inUse ) {

				if ( this.instructionQueuePointer < this.instructionQueue.length ) {

					prepData = this.instructionQueue[ this.instructionQueuePointer ];
					this._kickWorkerRun( prepData, supportDesc );
					this.instructionQueuePointer++;

				} else {

					this._deregister( supportDesc );

				}

			}

		}

		if ( ! this.isRunning() && this.callbackOnFinishedProcessing !== null ) {

			this.callbackOnFinishedProcessing();
			this.callbackOnFinishedProcessing = null;

		}
	};

	WorkerDirector.prototype._kickWorkerRun = function( prepData, supportDesc ) {
		supportDesc.inUse = true;
		supportDesc.workerSupport.setTerminateRequested( supportDesc.terminateRequested );

		if ( this.logging.enabled ) console.info( '\nAssigning next item from queue to worker (queue length: ' + this.instructionQueue.length + ')\n\n' );

		var scope = this;
		var prepDataCallbacks = prepData.getCallbacks();
		var globalCallbacks = this.workerDescription.globalCallbacks;
		var wrapperOnLoad = function ( event ) {
			if ( Validator.isValid( globalCallbacks.onLoad ) ) globalCallbacks.onLoad( event );
			if ( Validator.isValid( prepDataCallbacks.onLoad ) ) prepDataCallbacks.onLoad( event );
			scope.objectsCompleted++;
			supportDesc.inUse = false;

			scope.processQueue();
		};

		var wrapperOnProgress = function ( event ) {
			if ( Validator.isValid( globalCallbacks.onProgress ) ) globalCallbacks.onProgress( event );
			if ( Validator.isValid( prepDataCallbacks.onProgress ) ) prepDataCallbacks.onProgress( event );
		};

		var wrapperOnMeshAlter = function ( event ) {
			if ( Validator.isValid( globalCallbacks.onMeshAlter ) ) globalCallbacks.onMeshAlter( event );
			if ( Validator.isValid( prepDataCallbacks.onMeshAlter ) ) prepDataCallbacks.onMeshAlter( event );
		};

		supportDesc.loader = this._buildLoader( supportDesc.instanceNo );

		var updatedCallbacks = new THREE.LoaderSupport.Callbacks();
		updatedCallbacks.setCallbackOnLoad( wrapperOnLoad );
		updatedCallbacks.setCallbackOnProgress( wrapperOnProgress );
		updatedCallbacks.setCallbackOnMeshAlter( wrapperOnMeshAlter );
		prepData.callbacks = updatedCallbacks;

		supportDesc.loader.run( prepData, supportDesc.workerSupport );
	};

	WorkerDirector.prototype._buildLoader = function ( instanceNo ) {
		var classDef = this.workerDescription.classDef;
		var loader = Object.create( classDef.prototype );
		classDef.call( loader, THREE.DefaultLoadingManager );

		// verify that all required functions are implemented
		if ( ! loader.hasOwnProperty( 'instanceNo' ) ) throw classDef.name + ' has no property "instanceNo".';
		loader.instanceNo = instanceNo;

		if ( ! loader.hasOwnProperty( 'workerSupport' ) ) {

			throw classDef.name + ' has no property "workerSupport".';

		}
		if ( typeof loader.run !== 'function'  ) throw classDef.name + ' has no function "run".';
		if ( ! loader.hasOwnProperty( 'callbacks' ) || ! Validator.isValid( loader.callbacks ) ) {

			console.warn( classDef.name + ' has an invalid property "callbacks". Will change to "THREE.LoaderSupport.Callbacks"' );
			loader.callbacks = new THREE.LoaderSupport.Callbacks();

		}

		return loader;
	};

	WorkerDirector.prototype._deregister = function ( supportDesc ) {
		if ( Validator.isValid( supportDesc ) ) {

			supportDesc.workerSupport.setTerminateRequested( true );
			if ( this.logging.enabled ) console.info( 'Requested termination of worker #' + supportDesc.instanceNo + '.' );

			var loaderCallbacks = supportDesc.loader.callbacks;
			if ( Validator.isValid( loaderCallbacks.onProgress ) ) loaderCallbacks.onProgress( { detail: { text: '' } } );
			delete this.workerDescription.workerSupports[ supportDesc.instanceNo ];

		}
	};

	/**
	 * Terminate all workers.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {callback} callbackOnFinishedProcessing Function called once all workers finished processing.
	 */
	WorkerDirector.prototype.tearDown = function ( callbackOnFinishedProcessing ) {
		if ( this.logging.enabled ) console.info( 'WorkerDirector received the deregister call. Terminating all workers!' );

		this.instructionQueuePointer = this.instructionQueue.length;
		this.callbackOnFinishedProcessing = Validator.verifyInput( callbackOnFinishedProcessing, null );

		for ( var name in this.workerDescription.workerSupports ) {

			this.workerDescription.workerSupports[ name ].terminateRequested = true;

		}
	};

	return WorkerDirector;

})();

 return THREE.LoaderSupport;
});
define('vendor/three/loaders/OBJLoader2',["three", "LoaderSupport"], function(THREE, LoaderSupport){
/**
  * @author Kai Salmen / https://kaisalmen.de
  * Development repository: https://github.com/kaisalmen/WWOBJLoader
  */



if ( THREE.OBJLoader2 === undefined ) { THREE.OBJLoader2 = {} }

if ( THREE.LoaderSupport === undefined ) console.error( '"THREE.LoaderSupport" is not available. "THREE.OBJLoader2" requires it. Please include "LoaderSupport.js" in your HTML.' );

/**
 * Use this class to load OBJ data from files or to parse OBJ data from an arraybuffer
 * @class
 *
 * @param {THREE.DefaultLoadingManager} [manager] The loadingManager for the loader to use. Default is {@link THREE.DefaultLoadingManager}
 */
THREE.OBJLoader2 = (function () {

	var OBJLOADER2_VERSION = '2.4.0';
	var Validator = THREE.LoaderSupport.Validator;

	function OBJLoader2( manager ) {
		console.info( 'Using THREE.OBJLoader2 version: ' + OBJLOADER2_VERSION );

		this.manager = Validator.verifyInput( manager, THREE.DefaultLoadingManager );
		this.logging = {
			enabled: true,
			debug: false
		};

		this.modelName = '';
		this.instanceNo = 0;
		this.path = '';
		this.useIndices = false;
		this.disregardNormals = false;
		this.materialPerSmoothingGroup = false;
		this.loaderRootNode = new THREE.Group();

		this.meshBuilder = new THREE.LoaderSupport.MeshBuilder();
		this.callbacks = new THREE.LoaderSupport.Callbacks();
		this.workerSupport = new THREE.LoaderSupport.WorkerSupport();
		this.terminateWorkerOnLoad = true;
	}

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	OBJLoader2.prototype.setLogging = function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		this.meshBuilder.setLogging( this.logging.enabled, this.logging.debug );
	};

	/**
	 * Set the name of the model.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {string} modelName
	 */
	OBJLoader2.prototype.setModelName = function ( modelName ) {
		this.modelName = Validator.verifyInput( modelName, this.modelName );
	};

	/**
	 * The URL of the base path.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {string} path URL
	 */
	OBJLoader2.prototype.setPath = function ( path ) {
		this.path = Validator.verifyInput( path, this.path );
	};

	/**
	 * Set the node where the loaded objects will be attached directly.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {THREE.Object3D} streamMeshesTo Object already attached to scenegraph where new meshes will be attached to
	 */
	OBJLoader2.prototype.setStreamMeshesTo = function ( streamMeshesTo ) {
		this.loaderRootNode = Validator.verifyInput( streamMeshesTo, this.loaderRootNode );
	};

	/**
	 * Set materials loaded by MTLLoader or any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {THREE.Material[]} materials Array of {@link THREE.Material}
	 */
	OBJLoader2.prototype.setMaterials = function ( materials ) {
		this.meshBuilder.setMaterials( materials );
	};

	/**
	 * Instructs loaders to create indexed {@link THREE.BufferGeometry}.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {boolean} useIndices=false
	 */
	OBJLoader2.prototype.setUseIndices = function ( useIndices ) {
		this.useIndices = useIndices === true;
	};

	/**
	 * Tells whether normals should be completely disregarded and regenerated.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {boolean} disregardNormals=false
	 */
	OBJLoader2.prototype.setDisregardNormals = function ( disregardNormals ) {
		this.disregardNormals = disregardNormals === true;
	};

	/**
	 * Tells whether a material shall be created per smoothing group.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {boolean} materialPerSmoothingGroup=false
	 */
	OBJLoader2.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup === true;
	};

	OBJLoader2.prototype._setCallbacks = function ( callbacks ) {
		if ( Validator.isValid( callbacks.onProgress ) ) this.callbacks.setCallbackOnProgress( callbacks.onProgress );
		if ( Validator.isValid( callbacks.onMeshAlter ) ) this.callbacks.setCallbackOnMeshAlter( callbacks.onMeshAlter );
		if ( Validator.isValid( callbacks.onLoad ) ) this.callbacks.setCallbackOnLoad( callbacks.onLoad );
		if ( Validator.isValid( callbacks.onLoadMaterials ) ) this.callbacks.setCallbackOnLoadMaterials( callbacks.onLoadMaterials );

		this.meshBuilder._setCallbacks( this.callbacks );
	};

	/**
	 * Announce feedback which is give to the registered callbacks.
	 * @memberOf THREE.OBJLoader2
	 * @private
	 *
	 * @param {string} type The type of event
	 * @param {string} text Textual description of the event
	 * @param {number} numericalValue Numerical value describing the progress
	 */
	OBJLoader2.prototype.onProgress = function ( type, text, numericalValue ) {
		var content = Validator.isValid( text ) ? text: '';
		var event = {
			detail: {
				type: type,
				modelName: this.modelName,
				instanceNo: this.instanceNo,
				text: content,
				numericalValue: numericalValue
			}
		};

		if ( Validator.isValid( this.callbacks.onProgress ) ) this.callbacks.onProgress( event );

		if ( this.logging.enabled && this.logging.debug ) console.debug( content );
	};

	OBJLoader2.prototype._onError = function ( event ) {
		var output = 'Error occurred while downloading!';

		if ( event.currentTarget && event.currentTarget.statusText !== null ) {

			output += '\nurl: ' + event.currentTarget.responseURL + '\nstatus: ' + event.currentTarget.statusText;

		}
		this.onProgress( 'error', output, -1 );
		throw output;
	};

	/**
	 * Use this convenient method to load a file at the given URL. By default the fileLoader uses an ArrayBuffer.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {callback} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
	 * @param {callback} [onProgress] A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, which contains total and Integer bytes.
	 * @param {callback} [onError] A function to be called if an error occurs during loading. The function receives the error as an argument.
	 * @param {callback} [onMeshAlter] A function to be called after a new mesh raw data becomes available for alteration.
	 * @param {boolean} [useAsync] If true, uses async loading with worker, if false loads data synchronously.
	 */
	OBJLoader2.prototype.load = function ( url, onLoad, onProgress, onError, onMeshAlter, useAsync ) {
		var resource = new THREE.LoaderSupport.ResourceDescriptor( url, 'OBJ' );
		this._loadObj( resource, onLoad, onProgress, onError, onMeshAlter, useAsync );
	};

	OBJLoader2.prototype._loadObj = function ( resource, onLoad, onProgress, onError, onMeshAlter, useAsync ) {
		if ( ! Validator.isValid( onError ) ) onError = this._onError;

		// fast-fail
		if ( ! Validator.isValid( resource ) ) onError( 'An invalid ResourceDescriptor was provided. Unable to continue!' );
		var scope = this;
		var fileLoaderOnLoad = function ( content ) {

			resource.content = content;
			if ( useAsync ) {

				scope.parseAsync( content, onLoad );

			} else {

				var callbacks = new THREE.LoaderSupport.Callbacks();
				callbacks.setCallbackOnMeshAlter( onMeshAlter );
				scope._setCallbacks( callbacks );
				onLoad(
					{
						detail: {
							loaderRootNode: scope.parse( content ),
							modelName: scope.modelName,
							instanceNo: scope.instanceNo
						}
					}
				);

			}
		};

		// fast-fail
		if ( ! Validator.isValid( resource.url ) || Validator.isValid( resource.content ) ) {

			fileLoaderOnLoad( Validator.isValid( resource.content ) ? resource.content : null );

		} else {

			if ( ! Validator.isValid( onProgress ) ) {
				var numericalValueRef = 0;
				var numericalValue = 0;
				onProgress = function ( event ) {
					if ( ! event.lengthComputable ) return;

					numericalValue = event.loaded / event.total;
					if ( numericalValue > numericalValueRef ) {

						numericalValueRef = numericalValue;
						var output = 'Download of "' + resource.url + '": ' + ( numericalValue * 100 ).toFixed( 2 ) + '%';
						scope.onProgress( 'progressLoad', output, numericalValue );

					}
				};
			}


			var fileLoader = new THREE.FileLoader( this.manager );
			fileLoader.setPath( this.path );
			fileLoader.setResponseType( 'arraybuffer' );
			fileLoader.load( resource.url, fileLoaderOnLoad, onProgress, onError );

		}
	};


	/**
	 * Run the loader according the provided instructions.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {THREE.LoaderSupport.PrepData} prepData All parameters and resources required for execution
	 * @param {THREE.LoaderSupport.WorkerSupport} [workerSupportExternal] Use pre-existing WorkerSupport
	 */
	OBJLoader2.prototype.run = function ( prepData, workerSupportExternal ) {
		this._applyPrepData( prepData );
		var available = prepData.checkResourceDescriptorFiles( prepData.resources,
			[
				{ ext: "obj", type: "ArrayBuffer", ignore: false },
				{ ext: "mtl", type: "String", ignore: false },
				{ ext: "zip", type: "String", ignore: true }
			]
		);
		if ( Validator.isValid( workerSupportExternal ) ) {

			this.terminateWorkerOnLoad = false;
			this.workerSupport = workerSupportExternal;
			this.logging.enabled = this.workerSupport.logging.enabled;
			this.logging.debug = this.workerSupport.logging.debug;

		}
		var scope = this;
		var onMaterialsLoaded = function ( materials ) {
			if ( materials !== null ) scope.meshBuilder.setMaterials( materials );
			scope._loadObj( available.obj, scope.callbacks.onLoad, null, null, scope.callbacks.onMeshAlter, prepData.useAsync );

		};
		this._loadMtl( available.mtl, onMaterialsLoaded, prepData.crossOrigin, prepData.materialOptions );
	};

	OBJLoader2.prototype._applyPrepData = function ( prepData ) {
		if ( Validator.isValid( prepData ) ) {

			this.setLogging( prepData.logging.enabled, prepData.logging.debug );
			this.setModelName( prepData.modelName );
			this.setStreamMeshesTo( prepData.streamMeshesTo );
			this.meshBuilder.setMaterials( prepData.materials );
			this.setUseIndices( prepData.useIndices );
			this.setDisregardNormals( prepData.disregardNormals );
			this.setMaterialPerSmoothingGroup( prepData.materialPerSmoothingGroup );

			this._setCallbacks( prepData.getCallbacks() );

		}
	};

	/**
	 * Parses OBJ data synchronously from arraybuffer or string.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {arraybuffer|string} content OBJ data as Uint8Array or String
	 */
	OBJLoader2.prototype.parse = function ( content ) {
		// fast-fail in case of illegal data
		if ( ! Validator.isValid( content ) ) {

			console.warn( 'Provided content is not a valid ArrayBuffer or String.' );
			return this.loaderRootNode;

		}
		if ( this.logging.enabled ) console.time( 'OBJLoader2 parse: ' + this.modelName );
		this.meshBuilder.init();

		var parser = new Parser();
		parser.setLogging( this.logging.enabled, this.logging.debug );
		parser.setMaterialPerSmoothingGroup( this.materialPerSmoothingGroup );
		parser.setUseIndices( this.useIndices );
		parser.setDisregardNormals( this.disregardNormals );
		// sync code works directly on the material references
		parser.setMaterials( this.meshBuilder.getMaterials() );

		var scope = this;
		var onMeshLoaded = function ( payload ) {
			var meshes = scope.meshBuilder.processPayload( payload );
			var mesh;
			for ( var i in meshes ) {
				mesh = meshes[ i ];
				scope.loaderRootNode.add( mesh );
			}
		};
		parser.setCallbackMeshBuilder( onMeshLoaded );
		var onProgressScoped = function ( text, numericalValue ) {
			scope.onProgress( 'progressParse', text, numericalValue );
		};
		parser.setCallbackProgress( onProgressScoped );

		if ( content instanceof ArrayBuffer || content instanceof Uint8Array ) {

			if ( this.logging.enabled ) console.info( 'Parsing arrayBuffer...' );
			parser.parse( content );

		} else if ( typeof( content ) === 'string' || content instanceof String ) {

			if ( this.logging.enabled ) console.info( 'Parsing text...' );
			parser.parseText( content );

		} else {

			throw 'Provided content was neither of type String nor Uint8Array! Aborting...';

		}
		if ( this.logging.enabled ) console.timeEnd( 'OBJLoader2 parse: ' + this.modelName );

		return this.loaderRootNode;
	};

	/**
	 * Parses OBJ content asynchronously from arraybuffer.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {arraybuffer} content OBJ data as Uint8Array
	 * @param {callback} onLoad Called after worker successfully completed loading
	 */
	OBJLoader2.prototype.parseAsync = function ( content, onLoad ) {
		var scope = this;
		var measureTime = false;
		var scopedOnLoad = function () {
			onLoad(
				{
					detail: {
						loaderRootNode: scope.loaderRootNode,
						modelName: scope.modelName,
						instanceNo: scope.instanceNo
					}
				}
			);
			if ( measureTime && scope.logging.enabled ) console.timeEnd( 'OBJLoader2 parseAsync: ' + scope.modelName );
		};
		// fast-fail in case of illegal data
		if ( ! Validator.isValid( content ) ) {

			console.warn( 'Provided content is not a valid ArrayBuffer.' );
			scopedOnLoad()

		} else {

			measureTime = true;

		}
		if ( measureTime && this.logging.enabled ) console.time( 'OBJLoader2 parseAsync: ' + this.modelName );
		this.meshBuilder.init();

		var scopedOnMeshLoaded = function ( payload ) {
			var meshes = scope.meshBuilder.processPayload( payload );
			var mesh;
			for ( var i in meshes ) {
				mesh = meshes[ i ];
				scope.loaderRootNode.add( mesh );
			}
		};
		var buildCode = function ( funcBuildObject, funcBuildSingleton ) {
			var workerCode = '';
			workerCode += '/**\n';
			workerCode += '  * This code was constructed by OBJLoader2 buildCode.\n';
			workerCode += '  */\n\n';
			workerCode += 'THREE = { LoaderSupport: {} };\n\n';
			workerCode += funcBuildObject( 'THREE.LoaderSupport.Validator', Validator );
			workerCode += funcBuildSingleton( 'Parser', Parser );

			return workerCode;
		};
		this.workerSupport.validate( buildCode, 'Parser' );
		this.workerSupport.setCallbacks( scopedOnMeshLoaded, scopedOnLoad );
		if ( scope.terminateWorkerOnLoad ) this.workerSupport.setTerminateRequested( true );

		var materialNames = {};
		var materials = this.meshBuilder.getMaterials();
		for ( var materialName in materials ) {

			materialNames[ materialName ] = materialName;

		}
		this.workerSupport.run(
			{
				params: {
					useAsync: true,
					materialPerSmoothingGroup: this.materialPerSmoothingGroup,
					useIndices: this.useIndices,
					disregardNormals: this.disregardNormals
				},
				logging: {
					enabled: this.logging.enabled,
					debug: this.logging.debug
				},
				materials: {
					// in async case only material names are supplied to parser
					materials: materialNames
				},
				data: {
					input: content,
					options: null
				}
			}
		);
	};


	/**
	 * Parse OBJ data either from ArrayBuffer or string
	 * @class
	 */
	var Parser = (function () {

		function Parser() {
			this.callbackProgress = null;
			this.callbackMeshBuilder = null;
			this.contentRef = null;
			this.legacyMode = false;

			this.materials = {};
			this.useAsync = false;
			this.materialPerSmoothingGroup = false;
			this.useIndices = false;
			this.disregardNormals = false;

			this.vertices = [];
			this.colors = [];
			this.normals = [];
			this.uvs = [];

			this.rawMesh = {
				objectName: '',
				groupName: '',
				activeMtlName: '',
				mtllibName: '',

				// reset with new mesh
				faceType: -1,
				subGroups: [],
				subGroupInUse: null,
				smoothingGroup: {
					splitMaterials: false,
					normalized: -1,
					real: -1
				},
				counts: {
					doubleIndicesCount: 0,
					faceCount: 0,
					mtlCount: 0,
					smoothingGroupCount: 0
				}
			};

			this.inputObjectCount = 1;
			this.outputObjectCount = 1;
			this.globalCounts = {
				vertices: 0,
				faces: 0,
				doubleIndicesCount: 0,
				lineByte: 0,
				currentByte: 0,
				totalBytes: 0
			};

			this.logging = {
				enabled: true,
				debug: false
			};
		}

		Parser.prototype.resetRawMesh = function () {
			// faces are stored according combined index of group, material and smoothingGroup (0 or not)
			this.rawMesh.subGroups = [];
			this.rawMesh.subGroupInUse = null;
			this.rawMesh.smoothingGroup.normalized = -1;
			this.rawMesh.smoothingGroup.real = -1;

			// this default index is required as it is possible to define faces without 'g' or 'usemtl'
			this.pushSmoothingGroup( 1 );

			this.rawMesh.counts.doubleIndicesCount = 0;
			this.rawMesh.counts.faceCount = 0;
			this.rawMesh.counts.mtlCount = 0;
			this.rawMesh.counts.smoothingGroupCount = 0;
		};

		Parser.prototype.setUseAsync = function ( useAsync ) {
			this.useAsync = useAsync;
		};

		Parser.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
			this.materialPerSmoothingGroup = materialPerSmoothingGroup;
		};

		Parser.prototype.setUseIndices = function ( useIndices ) {
			this.useIndices = useIndices;
		};

		Parser.prototype.setDisregardNormals = function ( disregardNormals ) {
			this.disregardNormals = disregardNormals;
		};

		Parser.prototype.setMaterials = function ( materials ) {
			this.materials = THREE.LoaderSupport.Validator.verifyInput( materials, this.materials );
			this.materials = THREE.LoaderSupport.Validator.verifyInput( this.materials, {} );
		};

		Parser.prototype.setCallbackMeshBuilder = function ( callbackMeshBuilder ) {
			if ( ! THREE.LoaderSupport.Validator.isValid( callbackMeshBuilder ) ) throw 'Unable to run as no "MeshBuilder" callback is set.';
			this.callbackMeshBuilder = callbackMeshBuilder;
		};

		Parser.prototype.setCallbackProgress = function ( callbackProgress ) {
			this.callbackProgress = callbackProgress;
		};

		Parser.prototype.setLogging = function ( enabled, debug ) {
			this.logging.enabled = enabled === true;
			this.logging.debug = debug === true;
		};

		Parser.prototype.configure = function () {
			this.pushSmoothingGroup( 1 );

			if ( this.logging.enabled ) {

				var matKeys = Object.keys( this.materials );
				var matNames = ( matKeys.length > 0 ) ? '\n\tmaterialNames:\n\t\t- ' + matKeys.join( '\n\t\t- ' ) : '\n\tmaterialNames: None';
				var printedConfig = 'OBJLoader2.Parser configuration:'
					+ matNames
					+ '\n\tuseAsync: ' + this.useAsync
					+ '\n\tmaterialPerSmoothingGroup: ' + this.materialPerSmoothingGroup
					+ '\n\tuseIndices: ' + this.useIndices
					+ '\n\tdisregardNormals: ' + this.disregardNormals
					+ '\n\tcallbackMeshBuilderName: ' + this.callbackMeshBuilder.name
					+ '\n\tcallbackProgressName: ' + this.callbackProgress.name;
				console.info( printedConfig );
			}
		};

		/**
		 * Parse the provided arraybuffer
		 * @memberOf Parser
		 *
		 * @param {Uint8Array} arrayBuffer OBJ data as Uint8Array
		 */
		Parser.prototype.parse = function ( arrayBuffer ) {
			if ( this.logging.enabled ) console.time( 'OBJLoader2.Parser.parse' );
			this.configure();

			var arrayBufferView = new Uint8Array( arrayBuffer );
			this.contentRef = arrayBufferView;
			var length = arrayBufferView.byteLength;
			this.globalCounts.totalBytes = length;
			var buffer = new Array( 128 );

			for ( var code, word = '', bufferPointer = 0, slashesCount = 0, i = 0; i < length; i++ ) {

				code = arrayBufferView[ i ];
				switch ( code ) {
					// space
					case 32:
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						break;
					// slash
					case 47:
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						slashesCount++;
						word = '';
						break;

					// LF
					case 10:
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						this.globalCounts.lineByte = this.globalCounts.currentByte;
						this.globalCounts.currentByte = i;
						this.processLine( buffer, bufferPointer, slashesCount );
						bufferPointer = 0;
						slashesCount = 0;
						break;

					// CR
					case 13:
						break;

					default:
						word += String.fromCharCode( code );
						break;
				}
			}
			this.finalizeParsing();
			if ( this.logging.enabled ) console.timeEnd(  'OBJLoader2.Parser.parse' );
		};

		/**
		 * Parse the provided text
		 * @memberOf Parser
		 *
		 * @param {string} text OBJ data as string
		 */
		Parser.prototype.parseText = function ( text ) {
			if ( this.logging.enabled ) console.time(  'OBJLoader2.Parser.parseText' );
			this.configure();
			this.legacyMode = true;
			this.contentRef = text;
			var length = text.length;
			this.globalCounts.totalBytes = length;
			var buffer = new Array( 128 );

			for ( var char, word = '', bufferPointer = 0, slashesCount = 0, i = 0; i < length; i++ ) {

				char = text[ i ];
				switch ( char ) {
					case ' ':
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						break;

					case '/':
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						slashesCount++;
						word = '';
						break;

					case '\n':
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						this.globalCounts.lineByte = this.globalCounts.currentByte;
						this.globalCounts.currentByte = i;
						this.processLine( buffer, bufferPointer, slashesCount );
						bufferPointer = 0;
						slashesCount = 0;
						break;

					case '\r':
						break;

					default:
						word += char;
				}
			}
			this.finalizeParsing();
			if ( this.logging.enabled ) console.timeEnd( 'OBJLoader2.Parser.parseText' );
		};

		Parser.prototype.processLine = function ( buffer, bufferPointer, slashesCount ) {
			if ( bufferPointer < 1 ) return;

			var reconstructString = function ( content, legacyMode, start, stop ) {
				var line = '';
				if ( stop > start ) {

					var i;
					if ( legacyMode ) {

						for ( i = start; i < stop; i++ ) line += content[ i ];

					} else {


						for ( i = start; i < stop; i++ ) line += String.fromCharCode( content[ i ] );

					}
					line = line.trim();

				}
				return line;
			};

			var bufferLength, length, i, lineDesignation;
			lineDesignation = buffer [ 0 ];
			switch ( lineDesignation ) {
				case 'v':
					this.vertices.push( parseFloat( buffer[ 1 ] ) );
					this.vertices.push( parseFloat( buffer[ 2 ] ) );
					this.vertices.push( parseFloat( buffer[ 3 ] ) );
					if ( bufferPointer > 4 ) {

						this.colors.push( parseFloat( buffer[ 4 ] ) );
						this.colors.push( parseFloat( buffer[ 5 ] ) );
						this.colors.push( parseFloat( buffer[ 6 ] ) );

					}
					break;

				case 'vt':
					this.uvs.push( parseFloat( buffer[ 1 ] ) );
					this.uvs.push( parseFloat( buffer[ 2 ] ) );
					break;

				case 'vn':
					this.normals.push( parseFloat( buffer[ 1 ] ) );
					this.normals.push( parseFloat( buffer[ 2 ] ) );
					this.normals.push( parseFloat( buffer[ 3 ] ) );
					break;

				case 'f':
					bufferLength = bufferPointer - 1;

					// "f vertex ..."
					if ( slashesCount === 0 ) {

						this.checkFaceType( 0 );
						for ( i = 2, length = bufferLength; i < length; i ++ ) {

							this.buildFace( buffer[ 1 ] );
							this.buildFace( buffer[ i ] );
							this.buildFace( buffer[ i + 1 ] );

						}

					// "f vertex/uv ..."
					} else if  ( bufferLength === slashesCount * 2 ) {

						this.checkFaceType( 1 );
						for ( i = 3, length = bufferLength - 2; i < length; i += 2 ) {

							this.buildFace( buffer[ 1 ], buffer[ 2 ] );
							this.buildFace( buffer[ i ], buffer[ i + 1 ] );
							this.buildFace( buffer[ i + 2 ], buffer[ i + 3 ] );

						}

					// "f vertex/uv/normal ..."
					} else if  ( bufferLength * 2 === slashesCount * 3 ) {

						this.checkFaceType( 2 );
						for ( i = 4, length = bufferLength - 3; i < length; i += 3 ) {

							this.buildFace( buffer[ 1 ], buffer[ 2 ], buffer[ 3 ] );
							this.buildFace( buffer[ i ], buffer[ i + 1 ], buffer[ i + 2 ] );
							this.buildFace( buffer[ i + 3 ], buffer[ i + 4 ], buffer[ i + 5 ] );

						}

					// "f vertex//normal ..."
					} else {

						this.checkFaceType( 3 );
						for ( i = 3, length = bufferLength - 2; i < length; i += 2 ) {

							this.buildFace( buffer[ 1 ], undefined, buffer[ 2 ] );
							this.buildFace( buffer[ i ], undefined, buffer[ i + 1 ] );
							this.buildFace( buffer[ i + 2 ], undefined, buffer[ i + 3 ] );

						}

					}
					break;

				case 'l':
				case 'p':
					bufferLength = bufferPointer - 1;
					if ( bufferLength === slashesCount * 2 )  {

						this.checkFaceType( 4 );
						for ( i = 1, length = bufferLength + 1; i < length; i += 2 ) this.buildFace( buffer[ i ], buffer[ i + 1 ] );

					} else {

						this.checkFaceType( ( lineDesignation === 'l' ) ? 5 : 6  );
						for ( i = 1, length = bufferLength + 1; i < length; i ++ ) this.buildFace( buffer[ i ] );

					}
					break;

				case 's':
					this.pushSmoothingGroup( buffer[ 1 ] );
					break;

				case 'g':
					// 'g' leads to creation of mesh if valid data (faces declaration was done before), otherwise only groupName gets set
					this.processCompletedMesh();
					this.rawMesh.groupName = reconstructString( this.contentRef, this.legacyMode, this.globalCounts.lineByte + 2, this.globalCounts.currentByte );
					break;

				case 'o':
					// 'o' is pure meta-information and does not result in creation of new meshes
					this.rawMesh.objectName = reconstructString( this.contentRef, this.legacyMode, this.globalCounts.lineByte + 2, this.globalCounts.currentByte );
					break;

				case 'mtllib':
					this.rawMesh.mtllibName = reconstructString( this.contentRef, this.legacyMode, this.globalCounts.lineByte + 7, this.globalCounts.currentByte );
					break;

				case 'usemtl':
					var mtlName = reconstructString( this.contentRef, this.legacyMode, this.globalCounts.lineByte + 7, this.globalCounts.currentByte );
					if ( mtlName !== '' && this.rawMesh.activeMtlName !== mtlName ) {

						this.rawMesh.activeMtlName = mtlName;
						this.rawMesh.counts.mtlCount++;
						this.checkSubGroup();

					}
					break;

				default:
					break;
			}
		};

		Parser.prototype.pushSmoothingGroup = function ( smoothingGroup ) {
			var smoothingGroupInt = parseInt( smoothingGroup );
			if ( isNaN( smoothingGroupInt ) ) {
				smoothingGroupInt = smoothingGroup === "off" ? 0 : 1;
			}

			var smoothCheck = this.rawMesh.smoothingGroup.normalized;
			this.rawMesh.smoothingGroup.normalized = this.rawMesh.smoothingGroup.splitMaterials ? smoothingGroupInt : ( smoothingGroupInt === 0 ) ? 0 : 1;
			this.rawMesh.smoothingGroup.real = smoothingGroupInt;

			if ( smoothCheck !== smoothingGroupInt ) {

				this.rawMesh.counts.smoothingGroupCount++;
				this.checkSubGroup();

			}
		};

		/**
		 * Expanded faceTypes include all four face types, both line types and the point type
		 * faceType = 0: "f vertex ..."
		 * faceType = 1: "f vertex/uv ..."
		 * faceType = 2: "f vertex/uv/normal ..."
		 * faceType = 3: "f vertex//normal ..."
		 * faceType = 4: "l vertex/uv ..." or "l vertex ..."
		 * faceType = 5: "l vertex ..."
		 * faceType = 6: "p vertex ..."
		 */
		Parser.prototype.checkFaceType = function ( faceType ) {
			if ( this.rawMesh.faceType !== faceType ) {

				this.processCompletedMesh();
				this.rawMesh.faceType = faceType;
				this.checkSubGroup();

			}
		};

		Parser.prototype.checkSubGroup = function () {
			var index = this.rawMesh.activeMtlName + '|' + this.rawMesh.smoothingGroup.normalized;
			this.rawMesh.subGroupInUse = this.rawMesh.subGroups[ index ];

			if ( ! THREE.LoaderSupport.Validator.isValid( this.rawMesh.subGroupInUse ) ) {

				this.rawMesh.subGroupInUse = {
					index: index,
					objectName: this.rawMesh.objectName,
					groupName: this.rawMesh.groupName,
					materialName: this.rawMesh.activeMtlName,
					smoothingGroup: this.rawMesh.smoothingGroup.normalized,
					vertices: [],
					indexMappingsCount: 0,
					indexMappings: [],
					indices: [],
					colors: [],
					uvs: [],
					normals: []
				};
				this.rawMesh.subGroups[ index ] = this.rawMesh.subGroupInUse;

			}
		};

		Parser.prototype.buildFace = function ( faceIndexV, faceIndexU, faceIndexN ) {
			if ( this.disregardNormals ) faceIndexN = undefined;
			var scope = this;
			var updateSubGroupInUse = function () {

				var faceIndexVi = parseInt( faceIndexV );
				var indexPointerV = 3 * ( faceIndexVi > 0 ? faceIndexVi - 1 : faceIndexVi + scope.vertices.length / 3 );

				var vertices = scope.rawMesh.subGroupInUse.vertices;
				vertices.push( scope.vertices[ indexPointerV++ ] );
				vertices.push( scope.vertices[ indexPointerV++ ] );
				vertices.push( scope.vertices[ indexPointerV ] );

				var indexPointerC = scope.colors.length > 0 ? indexPointerV : null;
				if ( indexPointerC !== null ) {

					var colors = scope.rawMesh.subGroupInUse.colors;
					colors.push( scope.colors[ indexPointerC++ ] );
					colors.push( scope.colors[ indexPointerC++ ] );
					colors.push( scope.colors[ indexPointerC ] );

				}
				if ( faceIndexU ) {

					var faceIndexUi = parseInt( faceIndexU );
					var indexPointerU = 2 * ( faceIndexUi > 0 ? faceIndexUi - 1 : faceIndexUi + scope.uvs.length / 2 );
					var uvs = scope.rawMesh.subGroupInUse.uvs;
					uvs.push( scope.uvs[ indexPointerU++ ] );
					uvs.push( scope.uvs[ indexPointerU ] );

				}
				if ( faceIndexN ) {

					var faceIndexNi = parseInt( faceIndexN );
					var indexPointerN = 3 * ( faceIndexNi > 0 ? faceIndexNi - 1 : faceIndexNi + scope.normals.length / 3 );
					var normals = scope.rawMesh.subGroupInUse.normals;
					normals.push( scope.normals[ indexPointerN++ ] );
					normals.push( scope.normals[ indexPointerN++ ] );
					normals.push( scope.normals[ indexPointerN ] );

				}
			};

			if ( this.useIndices ) {

				var mappingName = faceIndexV + ( faceIndexU ? '_' + faceIndexU : '_n' ) + ( faceIndexN ? '_' + faceIndexN : '_n' );
				var indicesPointer = this.rawMesh.subGroupInUse.indexMappings[ mappingName ];
				if ( THREE.LoaderSupport.Validator.isValid( indicesPointer ) ) {

					this.rawMesh.counts.doubleIndicesCount++;

				} else {

					indicesPointer = this.rawMesh.subGroupInUse.vertices.length / 3;
					updateSubGroupInUse();
					this.rawMesh.subGroupInUse.indexMappings[ mappingName ] = indicesPointer;
					this.rawMesh.subGroupInUse.indexMappingsCount++;

				}
				this.rawMesh.subGroupInUse.indices.push( indicesPointer );

			} else {

				updateSubGroupInUse();

			}
			this.rawMesh.counts.faceCount++;
		};

		Parser.prototype.createRawMeshReport = function ( inputObjectCount ) {
			return 'Input Object number: ' + inputObjectCount +
				'\n\tObject name: ' + this.rawMesh.objectName +
				'\n\tGroup name: ' + this.rawMesh.groupName +
				'\n\tMtllib name: ' + this.rawMesh.mtllibName +
				'\n\tVertex count: ' + this.vertices.length / 3 +
				'\n\tNormal count: ' + this.normals.length / 3 +
				'\n\tUV count: ' + this.uvs.length / 2 +
				'\n\tSmoothingGroup count: ' + this.rawMesh.counts.smoothingGroupCount +
				'\n\tMaterial count: ' + this.rawMesh.counts.mtlCount +
				'\n\tReal MeshOutputGroup count: ' + this.rawMesh.subGroups.length;
		};

		/**
		 * Clear any empty subGroup and calculate absolute vertex, normal and uv counts
		 */
		Parser.prototype.finalizeRawMesh = function () {
			var meshOutputGroupTemp = [];
			var meshOutputGroup;
			var absoluteVertexCount = 0;
			var absoluteIndexMappingsCount = 0;
			var absoluteIndexCount = 0;
			var absoluteColorCount = 0;
			var absoluteNormalCount = 0;
			var absoluteUvCount = 0;
			var indices;
			for ( var name in this.rawMesh.subGroups ) {

				meshOutputGroup = this.rawMesh.subGroups[ name ];
				if ( meshOutputGroup.vertices.length > 0 ) {

					indices = meshOutputGroup.indices;
					if ( indices.length > 0 && absoluteIndexMappingsCount > 0 ) {

						for ( var i in indices ) indices[ i ] = indices[ i ] + absoluteIndexMappingsCount;

					}
					meshOutputGroupTemp.push( meshOutputGroup );
					absoluteVertexCount += meshOutputGroup.vertices.length;
					absoluteIndexMappingsCount += meshOutputGroup.indexMappingsCount;
					absoluteIndexCount += meshOutputGroup.indices.length;
					absoluteColorCount += meshOutputGroup.colors.length;
					absoluteUvCount += meshOutputGroup.uvs.length;
					absoluteNormalCount += meshOutputGroup.normals.length;

				}
			}

			// do not continue if no result
			var result = null;
			if ( meshOutputGroupTemp.length > 0 ) {

				result = {
					name: this.rawMesh.groupName !== '' ? this.rawMesh.groupName : this.rawMesh.objectName,
					subGroups: meshOutputGroupTemp,
					absoluteVertexCount: absoluteVertexCount,
					absoluteIndexCount: absoluteIndexCount,
					absoluteColorCount: absoluteColorCount,
					absoluteNormalCount: absoluteNormalCount,
					absoluteUvCount: absoluteUvCount,
					faceCount: this.rawMesh.counts.faceCount,
					doubleIndicesCount: this.rawMesh.counts.doubleIndicesCount
				};

			}
			return result;
		};

		Parser.prototype.processCompletedMesh = function () {
			var result = this.finalizeRawMesh();
			if ( THREE.LoaderSupport.Validator.isValid( result ) ) {

				if ( this.colors.length > 0 && this.colors.length !== this.vertices.length ) {

					throw 'Vertex Colors were detected, but vertex count and color count do not match!';

				}
				if ( this.logging.enabled && this.logging.debug ) console.debug( this.createRawMeshReport( this.inputObjectCount ) );
				this.inputObjectCount++;

				this.buildMesh( result );
				var progressBytesPercent = this.globalCounts.currentByte / this.globalCounts.totalBytes;
				this.callbackProgress( 'Completed [o: ' + this.rawMesh.objectName + ' g:' + this.rawMesh.groupName + '] Total progress: ' + ( progressBytesPercent * 100 ).toFixed( 2 ) + '%', progressBytesPercent );
				this.resetRawMesh();
				return true;

			} else {

				return false;
			}
		};

		/**
		 * SubGroups are transformed to too intermediate format that is forwarded to the MeshBuilder.
		 * It is ensured that SubGroups only contain objects with vertices (no need to check).
		 *
		 * @param result
		 */
		Parser.prototype.buildMesh = function ( result ) {
			var meshOutputGroups = result.subGroups;

			var vertexFA = new Float32Array( result.absoluteVertexCount );
			this.globalCounts.vertices += result.absoluteVertexCount / 3;
			this.globalCounts.faces += result.faceCount;
			this.globalCounts.doubleIndicesCount += result.doubleIndicesCount;
			var indexUA = ( result.absoluteIndexCount > 0 ) ? new Uint32Array( result.absoluteIndexCount ) : null;
			var colorFA = ( result.absoluteColorCount > 0 ) ? new Float32Array( result.absoluteColorCount ) : null;
			var normalFA = ( result.absoluteNormalCount > 0 ) ? new Float32Array( result.absoluteNormalCount ) : null;
			var uvFA = ( result.absoluteUvCount > 0 ) ? new Float32Array( result.absoluteUvCount ) : null;
			var haveVertexColors = THREE.LoaderSupport.Validator.isValid( colorFA );

			var meshOutputGroup;
			var materialNames = [];

			var createMultiMaterial = ( meshOutputGroups.length > 1 );
			var materialIndex = 0;
			var materialIndexMapping = [];
			var selectedMaterialIndex;
			var materialGroup;
			var materialGroups = [];

			var vertexFAOffset = 0;
			var indexUAOffset = 0;
			var colorFAOffset = 0;
			var normalFAOffset = 0;
			var uvFAOffset = 0;
			var materialGroupOffset = 0;
			var materialGroupLength = 0;

			var materialOrg, material, materialName, materialNameOrg;
			// only one specific face type
			for ( var oodIndex in meshOutputGroups ) {

				if ( ! meshOutputGroups.hasOwnProperty( oodIndex ) ) continue;
				meshOutputGroup = meshOutputGroups[ oodIndex ];

				materialNameOrg = meshOutputGroup.materialName;
				if ( this.rawMesh.faceType < 4 ) {

					materialName = materialNameOrg + ( haveVertexColors ? '_vertexColor' : '' ) + ( meshOutputGroup.smoothingGroup === 0 ? '_flat' : '' );


				} else {

					materialName = this.rawMesh.faceType === 6 ? 'defaultPointMaterial' : 'defaultLineMaterial';

				}
				materialOrg = this.materials[ materialNameOrg ];
				material = this.materials[ materialName ];

				// both original and derived names do not lead to an existing material => need to use a default material
				if ( ! THREE.LoaderSupport.Validator.isValid( materialOrg ) && ! THREE.LoaderSupport.Validator.isValid( material ) ) {

					var defaultMaterialName = haveVertexColors ? 'defaultVertexColorMaterial' : 'defaultMaterial';
					materialOrg = this.materials[ defaultMaterialName ];
					if ( this.logging.enabled ) console.warn( 'object_group "' + meshOutputGroup.objectName + '_' +
						meshOutputGroup.groupName + '" was defined with unresolvable material "' +
						materialNameOrg + '"! Assigning "' + defaultMaterialName + '".' );
					materialNameOrg = defaultMaterialName;

					// if names are identical then there is no need for later manipulation
					if ( materialNameOrg === materialName ) {

						material = materialOrg;
						materialName = defaultMaterialName;

					}

				}
				if ( ! THREE.LoaderSupport.Validator.isValid( material ) ) {

					var materialCloneInstructions = {
						materialNameOrg: materialNameOrg,
						materialName: materialName,
						materialProperties: {
							vertexColors: haveVertexColors ? 2 : 0,
							flatShading: meshOutputGroup.smoothingGroup === 0
						}
					};
					var payload = {
						cmd: 'materialData',
						materials: {
							materialCloneInstructions: materialCloneInstructions
						}
					};
					this.callbackMeshBuilder( payload );

					// fake entry for async; sync Parser always works on material references (Builder update directly visible here)
					if ( this.useAsync ) this.materials[ materialName ] = materialCloneInstructions;

				}

				if ( createMultiMaterial ) {

					// re-use material if already used before. Reduces materials array size and eliminates duplicates
					selectedMaterialIndex = materialIndexMapping[ materialName ];
					if ( ! selectedMaterialIndex ) {

						selectedMaterialIndex = materialIndex;
						materialIndexMapping[ materialName ] = materialIndex;
						materialNames.push( materialName );
						materialIndex++;

					}
					materialGroupLength = this.useIndices ? meshOutputGroup.indices.length : meshOutputGroup.vertices.length / 3;
					materialGroup = {
						start: materialGroupOffset,
						count: materialGroupLength,
						index: selectedMaterialIndex
					};
					materialGroups.push( materialGroup );
					materialGroupOffset += materialGroupLength;

				} else {

					materialNames.push( materialName );

				}

				vertexFA.set( meshOutputGroup.vertices, vertexFAOffset );
				vertexFAOffset += meshOutputGroup.vertices.length;

				if ( indexUA ) {

					indexUA.set( meshOutputGroup.indices, indexUAOffset );
					indexUAOffset += meshOutputGroup.indices.length;

				}

				if ( colorFA ) {

					colorFA.set( meshOutputGroup.colors, colorFAOffset );
					colorFAOffset += meshOutputGroup.colors.length;

				}

				if ( normalFA ) {

					normalFA.set( meshOutputGroup.normals, normalFAOffset );
					normalFAOffset += meshOutputGroup.normals.length;

				}
				if ( uvFA ) {

					uvFA.set( meshOutputGroup.uvs, uvFAOffset );
					uvFAOffset += meshOutputGroup.uvs.length;

				}

				if ( this.logging.enabled && this.logging.debug ) {
					var materialIndexLine = THREE.LoaderSupport.Validator.isValid( selectedMaterialIndex ) ? '\n\t\tmaterialIndex: ' + selectedMaterialIndex : '';
					var createdReport = '\tOutput Object no.: ' + this.outputObjectCount +
						'\n\t\tgroupName: ' + meshOutputGroup.groupName +
						'\n\t\tIndex: ' + meshOutputGroup.index +
						'\n\t\tfaceType: ' + this.rawMesh.faceType +
						'\n\t\tmaterialName: ' + meshOutputGroup.materialName +
						'\n\t\tsmoothingGroup: ' + meshOutputGroup.smoothingGroup +
						materialIndexLine +
						'\n\t\tobjectName: ' + meshOutputGroup.objectName +
						'\n\t\t#vertices: ' + meshOutputGroup.vertices.length / 3 +
						'\n\t\t#indices: ' + meshOutputGroup.indices.length +
						'\n\t\t#colors: ' + meshOutputGroup.colors.length / 3 +
						'\n\t\t#uvs: ' + meshOutputGroup.uvs.length / 2 +
						'\n\t\t#normals: ' + meshOutputGroup.normals.length / 3;
					console.debug( createdReport );
				}

			}

			this.outputObjectCount++;
			this.callbackMeshBuilder(
				{
					cmd: 'meshData',
					progress: {
						numericalValue: this.globalCounts.currentByte / this.globalCounts.totalBytes
					},
					params: {
						meshName: result.name
					},
					materials: {
						multiMaterial: createMultiMaterial,
						materialNames: materialNames,
						materialGroups: materialGroups
					},
					buffers: {
						vertices: vertexFA,
						indices: indexUA,
						colors: colorFA,
						normals: normalFA,
						uvs: uvFA
					},
					// 0: mesh, 1: line, 2: point
					geometryType: this.rawMesh.faceType < 4 ? 0 : ( this.rawMesh.faceType === 6 ) ? 2 : 1
				},
				[ vertexFA.buffer ],
				THREE.LoaderSupport.Validator.isValid( indexUA ) ? [ indexUA.buffer ] : null,
				THREE.LoaderSupport.Validator.isValid( colorFA ) ? [ colorFA.buffer ] : null,
				THREE.LoaderSupport.Validator.isValid( normalFA ) ? [ normalFA.buffer ] : null,
				THREE.LoaderSupport.Validator.isValid( uvFA ) ? [ uvFA.buffer ] : null
			);
		};

		Parser.prototype.finalizeParsing = function () {
			if ( this.logging.enabled ) console.info( 'Global output object count: ' + this.outputObjectCount );
			if ( this.processCompletedMesh() && this.logging.enabled ) {

				var parserFinalReport = 'Overall counts: ' +
					'\n\tVertices: ' + this.globalCounts.vertices +
					'\n\tFaces: ' + this.globalCounts.faces +
					'\n\tMultiple definitions: ' + this.globalCounts.doubleIndicesCount;
				console.info( parserFinalReport );

			}
		};

		return Parser;
	})();

	/**
	 * Utility method for loading an mtl file according resource description. Provide url or content.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {string} url URL to the file
	 * @param {Object} content The file content as arraybuffer or text
	 * @param {function} callbackOnLoad Callback to be called after successful load
	 * @param {string} [crossOrigin] CORS value
 	 * @param {Object} [materialOptions] Set material loading options for MTLLoader
	 */
	OBJLoader2.prototype.loadMtl = function ( url, content, callbackOnLoad, crossOrigin, materialOptions ) {
		var resource = new THREE.LoaderSupport.ResourceDescriptor( url, 'MTL' );
		resource.setContent( content );
		this._loadMtl( resource, callbackOnLoad, crossOrigin, materialOptions );
	};


	OBJLoader2.prototype._loadMtl = function ( resource, callbackOnLoad, crossOrigin, materialOptions ) {
		if ( THREE.MTLLoader === undefined ) console.error( '"THREE.MTLLoader" is not available. "THREE.OBJLoader2" requires it for loading MTL files.' );
		if ( Validator.isValid( resource ) && this.logging.enabled ) console.time( 'Loading MTL: ' + resource.name );

		var materials = [];
		var scope = this;
		var processMaterials = function ( materialCreator ) {
			var materialCreatorMaterials = [];
			if ( Validator.isValid( materialCreator ) ) {

				materialCreator.preload();
				materialCreatorMaterials = materialCreator.materials;
				for ( var materialName in materialCreatorMaterials ) {

					if ( materialCreatorMaterials.hasOwnProperty( materialName ) ) {

						materials[ materialName ] = materialCreatorMaterials[ materialName ];

					}
				}
			}

			if ( Validator.isValid( resource ) && scope.logging.enabled ) console.timeEnd( 'Loading MTL: ' + resource.name );
			callbackOnLoad( materials, materialCreator );
		};

		// fast-fail
		if ( ! Validator.isValid( resource ) || ( ! Validator.isValid( resource.content ) && ! Validator.isValid( resource.url ) ) ) {

			processMaterials();

		} else {

			var mtlLoader = new THREE.MTLLoader( this.manager );
			crossOrigin = Validator.verifyInput( crossOrigin, 'anonymous' );
			mtlLoader.setCrossOrigin( crossOrigin );
			mtlLoader.setPath( resource.path );
			if ( Validator.isValid( materialOptions ) ) mtlLoader.setMaterialOptions( materialOptions );

			if ( Validator.isValid( resource.content ) ) {

				processMaterials( Validator.isValid( resource.content ) ? mtlLoader.parse( resource.content ) : null );

			} else if ( Validator.isValid( resource.url ) ) {

				var fileLoader = new THREE.FileLoader( this.manager );
				fileLoader.load( resource.url, function ( text ) {

					resource.content = text;
					processMaterials( mtlLoader.parse( text ) );

				}, this._onProgress, this._onError );

			}
		}
	};

	return OBJLoader2;
})();

 return THREE.OBJLoader2;
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define('OBJLoader',["three", "vendor/three/loaders/OBJLoader2", "lodash"], function( THREE, OBJLoader2, _ ){
    var OBJLoader = function ( manager, logger )
    { 
        OBJLoader2.call( this, manager, logger );
    };

    OBJLoader.prototype = _.create( OBJLoader2.prototype, {
        constructor : OBJLoader,
        
        load : function(url, onLoad, onProgress, onError)
        {
            onLoad = onLoad || function(){};
            if( url === null || url === undefined || url === "" ) {
                onLoad( null );
            };
            var scope = this;

            var path = scope.path === undefined ? THREE.LoaderUtils.extractUrlBase( url ) : scope.path;

            require(["text!" + url], function ( responseText ) {
                var fnc = onLoad || function(){};
                fnc ( scope.parse( responseText, path ) );
            }, onError);
        }
        
    });

    return OBJLoader;
});


define('vendor/three/loaders/MTLLoader',["three"], function(THREE){
/**
 * Loads a Wavefront .mtl file specifying materials
 *
 * @author angelxuanchang
 */

THREE.MTLLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.MTLLoader.prototype = {

	constructor: THREE.MTLLoader,

	/**
	 * Loads and parses a MTL asset from a URL.
	 *
	 * @param {String} url - URL to the MTL file.
	 * @param {Function} [onLoad] - Callback invoked with the loaded object.
	 * @param {Function} [onProgress] - Callback for download progress.
	 * @param {Function} [onError] - Callback for download errors.
	 *
	 * @see setPath setTexturePath
	 *
	 * @note In order for relative texture references to resolve correctly
	 * you must call setPath and/or setTexturePath explicitly prior to load.
	 */
	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.FileLoader( this.manager );
		loader.setPath( this.path );
		loader.load( url, function ( text ) {

			onLoad( scope.parse( text ) );

		}, onProgress, onError );

	},

	/**
	 * Set base path for resolving references.
	 * If set this path will be prepended to each loaded and found reference.
	 *
	 * @see setTexturePath
	 * @param {String} path
	 *
	 * @example
	 *     mtlLoader.setPath( 'assets/obj/' );
	 *     mtlLoader.load( 'my.mtl', ... );
	 */
	setPath: function ( path ) {

		this.path = path;

	},

	/**
	 * Set base path for resolving texture references.
	 * If set this path will be prepended found texture reference.
	 * If not set and setPath is, it will be used as texture base path.
	 *
	 * @see setPath
	 * @param {String} path
	 *
	 * @example
	 *     mtlLoader.setPath( 'assets/obj/' );
	 *     mtlLoader.setTexturePath( 'assets/textures/' );
	 *     mtlLoader.load( 'my.mtl', ... );
	 */
	setTexturePath: function ( path ) {

		this.texturePath = path;

	},

	setBaseUrl: function ( path ) {

		console.warn( 'THREE.MTLLoader: .setBaseUrl() is deprecated. Use .setTexturePath( path ) for texture path or .setPath( path ) for general base path instead.' );

		this.setTexturePath( path );

	},

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;

	},

	setMaterialOptions: function ( value ) {

		this.materialOptions = value;

	},

	/**
	 * Parses a MTL file.
	 *
	 * @param {String} text - Content of MTL file
	 * @return {THREE.MTLLoader.MaterialCreator}
	 *
	 * @see setPath setTexturePath
	 *
	 * @note In order for relative texture references to resolve correctly
	 * you must call setPath and/or setTexturePath explicitly prior to parse.
	 */
	parse: function ( text ) {

		var lines = text.split( '\n' );
		var info = {};
		var delimiter_pattern = /\s+/;
		var materialsInfo = {};

		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ];
			line = line.trim();

			if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

				// Blank line or comment ignore
				continue;

			}

			var pos = line.indexOf( ' ' );

			var key = ( pos >= 0 ) ? line.substring( 0, pos ) : line;
			key = key.toLowerCase();

			var value = ( pos >= 0 ) ? line.substring( pos + 1 ) : '';
			value = value.trim();

			if ( key === 'newmtl' ) {

				// New material

				info = { name: value };
				materialsInfo[ value ] = info;

			} else if ( info ) {

				if ( key === 'ka' || key === 'kd' || key === 'ks' ) {

					var ss = value.split( delimiter_pattern, 3 );
					info[ key ] = [ parseFloat( ss[ 0 ] ), parseFloat( ss[ 1 ] ), parseFloat( ss[ 2 ] ) ];

				} else {

					info[ key ] = value;

				}

			}

		}

		var materialCreator = new THREE.MTLLoader.MaterialCreator( this.texturePath || this.path, this.materialOptions );
		materialCreator.setCrossOrigin( this.crossOrigin );
		materialCreator.setManager( this.manager );
		materialCreator.setMaterials( materialsInfo );
		return materialCreator;

	}

};

/**
 * Create a new THREE-MTLLoader.MaterialCreator
 * @param baseUrl - Url relative to which textures are loaded
 * @param options - Set of options on how to construct the materials
 *                  side: Which side to apply the material
 *                        THREE.FrontSide (default), THREE.BackSide, THREE.DoubleSide
 *                  wrap: What type of wrapping to apply for textures
 *                        THREE.RepeatWrapping (default), THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping
 *                  normalizeRGB: RGBs need to be normalized to 0-1 from 0-255
 *                                Default: false, assumed to be already normalized
 *                  ignoreZeroRGBs: Ignore values of RGBs (Ka,Kd,Ks) that are all 0's
 *                                  Default: false
 * @constructor
 */

THREE.MTLLoader.MaterialCreator = function ( baseUrl, options ) {

	this.baseUrl = baseUrl || '';
	this.options = options;
	this.materialsInfo = {};
	this.materials = {};
	this.materialsArray = [];
	this.nameLookup = {};

	this.side = ( this.options && this.options.side ) ? this.options.side : THREE.FrontSide;
	this.wrap = ( this.options && this.options.wrap ) ? this.options.wrap : THREE.RepeatWrapping;

};

THREE.MTLLoader.MaterialCreator.prototype = {

	constructor: THREE.MTLLoader.MaterialCreator,

	crossOrigin: 'Anonymous',

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;

	},

	setManager: function ( value ) {

		this.manager = value;

	},

	setMaterials: function ( materialsInfo ) {

		this.materialsInfo = this.convert( materialsInfo );
		this.materials = {};
		this.materialsArray = [];
		this.nameLookup = {};

	},

	convert: function ( materialsInfo ) {

		if ( ! this.options ) return materialsInfo;

		var converted = {};

		for ( var mn in materialsInfo ) {

			// Convert materials info into normalized form based on options

			var mat = materialsInfo[ mn ];

			var covmat = {};

			converted[ mn ] = covmat;

			for ( var prop in mat ) {

				var save = true;
				var value = mat[ prop ];
				var lprop = prop.toLowerCase();

				switch ( lprop ) {

					case 'kd':
					case 'ka':
					case 'ks':

						// Diffuse color (color under white light) using RGB values

						if ( this.options && this.options.normalizeRGB ) {

							value = [ value[ 0 ] / 255, value[ 1 ] / 255, value[ 2 ] / 255 ];

						}

						if ( this.options && this.options.ignoreZeroRGBs ) {

							if ( value[ 0 ] === 0 && value[ 1 ] === 0 && value[ 2 ] === 0 ) {

								// ignore

								save = false;

							}

						}

						break;

					default:

						break;

				}

				if ( save ) {

					covmat[ lprop ] = value;

				}

			}

		}

		return converted;

	},

	preload: function () {

		for ( var mn in this.materialsInfo ) {

			this.create( mn );

		}

	},

	getIndex: function ( materialName ) {

		return this.nameLookup[ materialName ];

	},

	getAsArray: function () {

		var index = 0;

		for ( var mn in this.materialsInfo ) {

			this.materialsArray[ index ] = this.create( mn );
			this.nameLookup[ mn ] = index;
			index ++;

		}

		return this.materialsArray;

	},

	create: function ( materialName ) {

		if ( this.materials[ materialName ] === undefined ) {

			this.createMaterial_( materialName );

		}

		return this.materials[ materialName ];

	},

	createMaterial_: function ( materialName ) {

		// Create material

		var scope = this;
		var mat = this.materialsInfo[ materialName ];
		var params = {

			name: materialName,
			side: this.side

		};

		function resolveURL( baseUrl, url ) {

			if ( typeof url !== 'string' || url === '' )
				return '';

			// Absolute URL
			if ( /^https?:\/\//i.test( url ) ) return url;

			return baseUrl + url;

		}

		function setMapForType( mapType, value ) {

			if ( params[ mapType ] ) return; // Keep the first encountered texture

			var texParams = scope.getTextureParams( value, params );
			var map = scope.loadTexture( resolveURL( scope.baseUrl, texParams.url ) );

			map.repeat.copy( texParams.scale );
			map.offset.copy( texParams.offset );

			map.wrapS = scope.wrap;
			map.wrapT = scope.wrap;

			params[ mapType ] = map;

		}

		for ( var prop in mat ) {

			var value = mat[ prop ];
			var n;

			if ( value === '' ) continue;

			switch ( prop.toLowerCase() ) {

				// Ns is material specular exponent

				case 'kd':

					// Diffuse color (color under white light) using RGB values

					params.color = new THREE.Color().fromArray( value );

					break;

				case 'ks':

					// Specular color (color when light is reflected from shiny surface) using RGB values
					params.specular = new THREE.Color().fromArray( value );

					break;

				case 'map_kd':

					// Diffuse texture map

					setMapForType( "map", value );

					break;

				case 'map_ks':

					// Specular map

					setMapForType( "specularMap", value );

					break;

				case 'norm':

					setMapForType( "normalMap", value );

					break;

				case 'map_bump':
				case 'bump':

					// Bump texture map

					setMapForType( "bumpMap", value );

					break;

				case 'ns':

					// The specular exponent (defines the focus of the specular highlight)
					// A high exponent results in a tight, concentrated highlight. Ns values normally range from 0 to 1000.

					params.shininess = parseFloat( value );

					break;

				case 'd':
					n = parseFloat( value );

					if ( n < 1 ) {

						params.opacity = n;
						params.transparent = true;

					}

					break;

				case 'tr':
					n = parseFloat( value );

					if ( this.options && this.options.invertTrProperty ) n = 1 - n;

					if ( n < 1 ) {

						params.opacity = n;
						params.transparent = true;

					}

					break;

				default:
					break;

			}

		}

		this.materials[ materialName ] = new THREE.MeshPhongMaterial( params );
		return this.materials[ materialName ];

	},

	getTextureParams: function ( value, matParams ) {

		var texParams = {

			scale: new THREE.Vector2( 1, 1 ),
			offset: new THREE.Vector2( 0, 0 )

		 };

		var items = value.split( /\s+/ );
		var pos;

		pos = items.indexOf( '-bm' );

		if ( pos >= 0 ) {

			matParams.bumpScale = parseFloat( items[ pos + 1 ] );
			items.splice( pos, 2 );

		}

		pos = items.indexOf( '-s' );

		if ( pos >= 0 ) {

			texParams.scale.set( parseFloat( items[ pos + 1 ] ), parseFloat( items[ pos + 2 ] ) );
			items.splice( pos, 4 ); // we expect 3 parameters here!

		}

		pos = items.indexOf( '-o' );

		if ( pos >= 0 ) {

			texParams.offset.set( parseFloat( items[ pos + 1 ] ), parseFloat( items[ pos + 2 ] ) );
			items.splice( pos, 4 ); // we expect 3 parameters here!

		}

		texParams.url = items.join( ' ' ).trim();
		return texParams;

	},

	loadTexture: function ( url, mapping, onLoad, onProgress, onError ) {

		var texture;
		var loader = THREE.Loader.Handlers.get( url );
		var manager = ( this.manager !== undefined ) ? this.manager : THREE.DefaultLoadingManager;

		if ( loader === null ) {

			loader = new THREE.TextureLoader( manager );

		}

		if ( loader.setCrossOrigin ) loader.setCrossOrigin( this.crossOrigin );
		texture = loader.load( url, onLoad, onProgress, onError );

		if ( mapping !== undefined ) texture.mapping = mapping;

		return texture;

	}

};

 return THREE.MTLLoader;
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define('MTLLoader',["three", "vendor/three/loaders/MTLLoader", "lodash"], function( THREE, ThreeMTLLoader, _ ){
    var MTLLoader = function ( manager, logger )
    { 
        ThreeMTLLoader.call( this, manager, logger );
    };

    MTLLoader.prototype = _.create( ThreeMTLLoader.prototype, {
        constructor : MTLLoader,
        
        load : function(url, onLoad, onProgress, onError)
        {
            onLoad = onLoad || function(){};
            if( url === null || url === undefined || url === "" ) {
                onLoad( null );
            };
            var scope = this;

            var path = scope.path === undefined ? THREE.LoaderUtils.extractUrlBase( url ) : scope.path;

            require(["text!" + url], function ( responseText ) {
                var fnc = onLoad || function(){};
                fnc ( scope.parse( responseText, path ) );
            }, onError);
        }
        
    });

    return MTLLoader;
});


define('vendor/three/loaders/STLLoader',["three"], function(THREE){
/**
 * @author aleeper / http://adamleeper.com/
 * @author mrdoob / http://mrdoob.com/
 * @author gero3 / https://github.com/gero3
 * @author Mugen87 / https://github.com/Mugen87
 *
 * Description: A THREE loader for STL ASCII files, as created by Solidworks and other CAD programs.
 *
 * Supports both binary and ASCII encoded files, with automatic detection of type.
 *
 * The loader returns a non-indexed buffer geometry.
 *
 * Limitations:
 *  Binary decoding supports "Magics" color format (http://en.wikipedia.org/wiki/STL_(file_format)#Color_in_binary_STL).
 *  There is perhaps some question as to how valid it is to always assume little-endian-ness.
 *  ASCII decoding assumes file is UTF-8.
 *
 * Usage:
 *  var loader = new THREE.STLLoader();
 *  loader.load( './models/stl/slotted_disk.stl', function ( geometry ) {
 *    scene.add( new THREE.Mesh( geometry ) );
 *  });
 *
 * For binary STLs geometry might contain colors for vertices. To use it:
 *  // use the same code to load STL as above
 *  if (geometry.hasColors) {
 *    material = new THREE.MeshPhongMaterial({ opacity: geometry.alpha, vertexColors: THREE.VertexColors });
 *  } else { .... }
 *  var mesh = new THREE.Mesh( geometry, material );
 */


THREE.STLLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.STLLoader.prototype = {

	constructor: THREE.STLLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.FileLoader( scope.manager );
		loader.setResponseType( 'arraybuffer' );
		loader.load( url, function ( text ) {

			try {

				onLoad( scope.parse( text ) );

			} catch ( exception ) {

				if ( onError ) {

					onError( exception );

				}

			}

		}, onProgress, onError );

	},

	parse: function ( data ) {

		function isBinary( data ) {

			var expect, face_size, n_faces, reader;
			reader = new DataView( data );
			face_size = ( 32 / 8 * 3 ) + ( ( 32 / 8 * 3 ) * 3 ) + ( 16 / 8 );
			n_faces = reader.getUint32( 80, true );
			expect = 80 + ( 32 / 8 ) + ( n_faces * face_size );

			if ( expect === reader.byteLength ) {

				return true;

			}

			// An ASCII STL data must begin with 'solid ' as the first six bytes.
			// However, ASCII STLs lacking the SPACE after the 'd' are known to be
			// plentiful.  So, check the first 5 bytes for 'solid'.

			// US-ASCII ordinal values for 's', 'o', 'l', 'i', 'd'

			var solid = [ 115, 111, 108, 105, 100 ];

			for ( var i = 0; i < 5; i ++ ) {

				// If solid[ i ] does not match the i-th byte, then it is not an
				// ASCII STL; hence, it is binary and return true.

				if ( solid[ i ] != reader.getUint8( i, false ) ) return true;

 			}

			// First 5 bytes read "solid"; declare it to be an ASCII STL

			return false;

		}

		function parseBinary( data ) {

			var reader = new DataView( data );
			var faces = reader.getUint32( 80, true );

			var r, g, b, hasColors = false, colors;
			var defaultR, defaultG, defaultB, alpha;

			// process STL header
			// check for default color in header ("COLOR=rgba" sequence).

			for ( var index = 0; index < 80 - 10; index ++ ) {

				if ( ( reader.getUint32( index, false ) == 0x434F4C4F /*COLO*/ ) &&
					( reader.getUint8( index + 4 ) == 0x52 /*'R'*/ ) &&
					( reader.getUint8( index + 5 ) == 0x3D /*'='*/ ) ) {

					hasColors = true;
					colors = [];

					defaultR = reader.getUint8( index + 6 ) / 255;
					defaultG = reader.getUint8( index + 7 ) / 255;
					defaultB = reader.getUint8( index + 8 ) / 255;
					alpha = reader.getUint8( index + 9 ) / 255;

				}

			}

			var dataOffset = 84;
			var faceLength = 12 * 4 + 2;

			var geometry = new THREE.BufferGeometry();

			var vertices = [];
			var normals = [];

			for ( var face = 0; face < faces; face ++ ) {

				var start = dataOffset + face * faceLength;
				var normalX = reader.getFloat32( start, true );
				var normalY = reader.getFloat32( start + 4, true );
				var normalZ = reader.getFloat32( start + 8, true );

				if ( hasColors ) {

					var packedColor = reader.getUint16( start + 48, true );

					if ( ( packedColor & 0x8000 ) === 0 ) {

						// facet has its own unique color

						r = ( packedColor & 0x1F ) / 31;
						g = ( ( packedColor >> 5 ) & 0x1F ) / 31;
						b = ( ( packedColor >> 10 ) & 0x1F ) / 31;

					} else {

						r = defaultR;
						g = defaultG;
						b = defaultB;

					}

				}

				for ( var i = 1; i <= 3; i ++ ) {

					var vertexstart = start + i * 12;

					vertices.push( reader.getFloat32( vertexstart, true ) );
					vertices.push( reader.getFloat32( vertexstart + 4, true ) );
					vertices.push( reader.getFloat32( vertexstart + 8, true ) );

					normals.push( normalX, normalY, normalZ );

					if ( hasColors ) {

						colors.push( r, g, b );

					}

				}

			}

			geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( vertices ), 3 ) );
			geometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( normals ), 3 ) );

			if ( hasColors ) {

				geometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( colors ), 3 ) );
				geometry.hasColors = true;
				geometry.alpha = alpha;

			}

			return geometry;

		}

		function parseASCII( data ) {

			var geometry = new THREE.BufferGeometry();
			var patternFace = /facet([\s\S]*?)endfacet/g;
			var faceCounter = 0;

			var patternFloat = /[\s]+([+-]?(?:\d+.\d+|\d+.|\d+|.\d+)(?:[eE][+-]?\d+)?)/.source;
			var patternVertex = new RegExp( 'vertex' + patternFloat + patternFloat + patternFloat, 'g' );
			var patternNormal = new RegExp( 'normal' + patternFloat + patternFloat + patternFloat, 'g' );

			var vertices = [];
			var normals = [];

			var normal = new THREE.Vector3();

			var result;

			while ( ( result = patternFace.exec( data ) ) !== null ) {

				var vertexCountPerFace = 0;
				var normalCountPerFace = 0;

				var text = result[ 0 ];

				while ( ( result = patternNormal.exec( text ) ) !== null ) {

					normal.x = parseFloat( result[ 1 ] );
					normal.y = parseFloat( result[ 2 ] );
					normal.z = parseFloat( result[ 3 ] );
					normalCountPerFace ++;

				}

				while ( ( result = patternVertex.exec( text ) ) !== null ) {

					vertices.push( parseFloat( result[ 1 ] ), parseFloat( result[ 2 ] ), parseFloat( result[ 3 ] ) );
					normals.push( normal.x, normal.y, normal.z );
					vertexCountPerFace ++;

				}

				// every face have to own ONE valid normal

				if ( normalCountPerFace !== 1 ) {

					console.error( 'THREE.STLLoader: Something isn\'t right with the normal of face number ' + faceCounter );

				}

				// each face have to own THREE valid vertices

				if ( vertexCountPerFace !== 3 ) {

					console.error( 'THREE.STLLoader: Something isn\'t right with the vertices of face number ' + faceCounter );

				}

				faceCounter ++;

			}

			geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
			geometry.addAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );

			return geometry;

		}

		function ensureString( buffer ) {

			if ( typeof buffer !== 'string' ) {

				return THREE.LoaderUtils.decodeText( new Uint8Array( buffer ) );

			}

			return buffer;

		}

		function ensureBinary( buffer ) {

			if ( typeof buffer === 'string' ) {

				var array_buffer = new Uint8Array( buffer.length );
				for ( var i = 0; i < buffer.length; i ++ ) {

					array_buffer[ i ] = buffer.charCodeAt( i ) & 0xff; // implicitly assumes little-endian

				}
				return array_buffer.buffer || array_buffer;

			} else {

				return buffer;

			}

		}

		// start

		var binData = ensureBinary( data );

		return isBinary( binData ) ? parseBinary( binData ) : parseASCII( ensureString( data ) );

	}

};

 return THREE.STLLoader;
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define('STLLoader',["three", "vendor/three/loaders/STLLoader", "lodash"], function( THREE, ThreeSTLLoader, _ ){
    var STLLoader = function ( manager, logger )
    { 
        ThreeSTLLoader.call( this, manager, logger );
    };

    STLLoader.prototype = _.create( ThreeSTLLoader.prototype, {
        constructor : STLLoader,
        
        load : function(url, onLoad, onProgress, onError)
        {
            onLoad = onLoad || function(){};
            if( url === null || url === undefined || url === "" ) {
                onLoad( null );
            };
            var scope = this;

            var path = scope.path === undefined ? THREE.LoaderUtils.extractUrlBase( url ) : scope.path;

            require(["text!" + url], function ( responseText ) {
                var fnc = onLoad || function(){};
                try{
                    fnc ( scope.parse( responseText, path ) );
                }
                catch( e ){
                    onError ( e );
                }
                
            }, onError);
        }
        
    });

    return STLLoader;
});


/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define('UniversalLoader',["three", "STLLoader", "ColladaLoader", "OBJLoader", "MTLLoader"], function( THREE, STLLoader, ColladaLoader, OBJLoader, MTLLoader ) {

    var UniversalLoader = function(){
        
    };

    UniversalLoader.prototype.load = function( urls, onLoad, onError ){
	
        // handle arguments polymorphism
	if( typeof(urls) === 'string' )	urls	= [urls];

	// load stl
	if( urls[0].match(/\.stl$/i) && urls.length === 1 ){
		this.loader	= new STLLoader();
		this.loader.addEventListener('load', function( event ){
			var geometry	= event.content;
			var material	= new THREE.MeshPhongMaterial();
			var object3d	= new THREE.Mesh( geometry, material );
			onLoad(object3d);
		});
		this.loader.load(urls[0]);
                
		return;
                
	}else if( urls[0].match(/\.dae$/i) && urls.length === 1 ){
		this.loader = new ColladaLoader();
		this.loader.options.convertUpAxis = true;
		this.loader.load(urls[0], function( collada ){
                    // console.dir(arguments)
                    var object3d = collada.scene;
                    onLoad( object3d );
		}, null, onError);
		return;
                
	}else if( urls[0].match(/\.js$/i) && urls.length === 1 ){
		this.loader = new THREE.JSONLoader();
		this.loader.load(urls[0], function(geometry, materials){
			if( materials.length > 1 ){
				var material	= new THREE.MeshFaceMaterial(materials);
			}else{
				var material	= materials[0];
			}
			var object3d	= new THREE.Mesh(geometry, material);
			onLoad(object3d);
		});
		return;
                
	}else if( urls[0].match(/\.obj$/i) && urls.length === 1 ){
		this.loader = new OBJLoader();
		this.loader.load(urls[0], function(object3d){
			onLoad(object3d);
		});
		return;
        }else if( urls[0].match(/\.mtl$/i) && urls.length === 1 ){
		this.loader	= new MTLLoader();
		this.loader.load(urls[1], urls[0], function( material ){
			onLoad( material );
		});
		return;
                        
	}else if( urls.length === 2 && urls[0].match(/\.mtl$/i) && urls[1].match(/\.obj$/i) ){
            _loadOBJMTL( [urls[1], urls[0]], onLoad, onError );
            return;
                
	}else if( urls.length === 2 && urls[0].match(/\.obj$/i) && urls[1].match(/\.mtl$/i) ){
            _loadOBJMTL( urls, onLoad, onError );
            return;
                
	}else	console.assert( false );
    };
    
    var _loadOBJMTL = function( urls, onLoad, onError ){
        
        var mtlLoader = new MTLLoader();
            //mtlLoader.setPath( 'models/obj/male02/' );
        
        mtlLoader.load( urls[1], function( materials ) {
            materials.preload();
            var objLoader = new OBJLoader();
            objLoader.setMaterials( materials );
            //objLoader.setPath( 'models/obj/male02/' );
            objLoader.load( urls[0], function ( object3d ) {

                onLoad( object3d );
            }, null, onError );
        });
        
    };
    
    return UniversalLoader;
});

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
define('ObjectDAE',["three", "lodash", "ColladaLoader"], function( THREE, _, ColladaLoader )
{
    var defaults = {
        shadow : false,
        scale : 39.37,
        onLoad : function(){}
    };

    var enableShadow = function( dae )
    {
        dae.traverse( function ( child ) {
            if ( child instanceof THREE.Mesh ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    };
    var setName = function( dae )
    {
        var counter = 0;
        dae.traverse( function ( child ) {
            if ( child instanceof THREE.Mesh ) {
                child.name = dae.name + counter;
                counter++;
            }
        });
    };

    var counterClockwiseFaceOrder = function( dae )
    {
        dae.traverse( function ( el ) {
            if ( el instanceof THREE.Mesh ) {
                _.each( el.geometry.faces, function( face ){
                    var temp = face.a;
                    face.a = face.c;
                    face.c = temp;
                });
            }
        });

    };

    var ObjectDAE = function( file, opt )
    {
        var loader = new ColladaLoader();
        loader.options.convertUpAxis = true;

        this.options = _.extend( {}, defaults, opt );

        THREE.Object3D.call( this );

        this.registerEvents();

        loader.load( file, function( collada )
        {
            var dae = collada.scene;
            dae.name = this.options.name || file;
            setName(dae);
            if ( this.options.shadow ) enableShadow( dae );

            var scaleX = (this.options.mirror)? -this.options.scale : this.options.scale;
            dae.scale.set( scaleX, this.options.scale, this.options.scale );

            if( this.options.mirror ) counterClockwiseFaceOrder( dae );

            this.add( dae );
            this.options.onLoad( this, dae );
        }.bind(this) );
    };

    //inherits from THREE.Object3D
    ObjectDAE.prototype = Object.create( THREE.Object3D.prototype );
    ObjectDAE.prototype.constructor = ObjectDAE;
    
    ObjectDAE.prototype.registerEvents = function(){
        
    };
    
    return ObjectDAE;
});


/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define('threeVP-Loaders',["ColladaLoader", "OBJLoader", "MTLLoader", "UniversalLoader", "ObjectDAE"], function( ColladaLoader, OBJLoader, MTLLoader, UniversalLoader, ObjectDAE ){
    return {
        ColladaLoader   : ColladaLoader,
        OBJLoader       : OBJLoader,
        MTLLoader       : MTLLoader,
        UniversalLoader : UniversalLoader,
        ObjectDAE       : ObjectDAE
    };
});

