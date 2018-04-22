/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')(); // Load all gulp plugins
                                              // automatically and attach
                                              // them to the `plugins` object

const _ = require('lodash');
const fs = require('fs');

var pkg = require('./package.json');
var dirs = pkg.directories;
var requireconfig = require("./config.json");


gulp.task('default', function () {
    // place code for your default task here
});

gulp.task( 'init', function ( done ) {

    var fnc = function( src, dest, req, name, mod )
    {
        fs.readFile( './node_modules/'+src, 'utf8', ( err, content ) => {
            if ( err ) { console.log( src, err ); return; }
            var end = ( typeof mod === "string" )? "\n return " + mod + ';'  : '';
            var ret = ( typeof req === "string" )? 'define('+req+', function('+name+'){\n' + content + end + "\n});" : content;
            fs.writeFile( dest, ret, 'utf8', ( err ) => {
                if ( err ) { console.log( err ); }
            }, ( res ) => {
                console.log( res );
            });
        });
    };
    
    var modules = require( "./node_modules.json" );
    
    _.each(modules, ( el ) =>{
        fnc(el.src, el.dest, el.req , el.name, el.mod);
    });
    
});

gulp.task( 'build', function ( done ) {
  
    plugins.requirejs(
        _.extend({}, requireconfig,
            {
                "stubModules" : ['base64'],
                "name"      : "core",
                "exclude"   : ["lodash", "json", "text", "base64", "image"],
                "out"       : "threeVP.js",
                "include"   : ["threeVP"]
            })
        ).on('error', console.log)
    .pipe( gulp.dest( dirs.dist ) );
    /*
    plugins.requirejs(
        _.extend({}, requireconfig,
            {
                "name"      : "core",
                "exclude"   : ["lodash", "json", "text", "base64"],
                "out"       : "threeVP.min.js",
                "include"   : ["threeVP"]
            })
        ).on('error', console.log)
    .pipe( plugins.uglify() )
    .pipe( gulp.dest( dirs.dist ) );
    */
});
