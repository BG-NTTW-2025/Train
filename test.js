(function(name,data){
 if(typeof onTileMapLoaded === 'undefined') {
  if(typeof TileMaps === 'undefined') TileMaps = {};
  TileMaps[name] = data;
 } else {
  onTileMapLoaded(name,data);
 }
 if(typeof module === 'object' && module && module.exports) {
  module.exports = data;
 }})("test",
{ "compressionlevel":-1,
 "editorsettings":
    {
     "export":
        {
         "format":"json",
         "target":"test.tmj"
        }
    },
 "height":10,
 "hexsidelength":31,
 "infinite":false,
 "layers":[
        {
         "draworder":"topdown",
         "id":2,
         "name":"Train",
         "objects":[],
         "opacity":1,
         "type":"objectgroup",
         "visible":true,
         "x":0,
         "y":0
        }, 
        {
         "data":[0, 0, 0, 0, 0, 0, 23, 23, 23, 23, 23, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 23, 10, 2, 2, 5, 23, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 23, 4, 23, 23, 23, 3, 23, 0, 0, 0,
            0, 0, 0, 0, 23, 4, 23, 23, 23, 23, 3, 23, 0, 0, 0,
            0, 0, 0, 0, 23, 4, 23, 23, 23, 23, 23, 6, 23, 0, 0,
            0, 0, 0, 23, 4, 23, 23, 67, 67, 68, 41, 68, 0, 0, 0,
            0, 0, 0, 23, 4, 23, 23, 67, 67, 10, 13, 23, 0, 0, 0,
            0, 0, 23, 9, 23, 10, 2, 2, 7, 4, 23, 0, 0, 0, 0,
            0, 0, 0, 23, 8, 17, 2, 2, 2, 7, 23, 0, 0, 0, 0,
            0, 0, 0, 23, 23, 23, 23, 23, 23, 23, 0, 0, 0, 0, 0],
         "height":10,
         "id":1,
         "name":"Tracks",
         "opacity":1,
         "type":"tilelayer",
         "visible":true,
         "width":15,
         "x":0,
         "y":0
        }],
 "nextlayerid":3,
 "nextobjectid":1,
 "orientation":"hexagonal",
 "renderorder":"right-up",
 "staggeraxis":"y",
 "staggerindex":"odd",
 "tiledversion":"1.12.2",
 "tileheight":62,
 "tilesets":[
        {
         "firstgid":1,
         "source":"Gameparts.tsj"
        }],
 "tilewidth":54,
 "type":"map",
 "version":"1.10",
 "width":15
});