/*
	THREE.CSG
	@author Chandler Prall <chandler.prall@gmail.com> http://chandler.prallfamily.com
	
	Wrapper for Evan Wallace's CSG library (https://github.com/evanw/csg.js/)
	Provides CSG capabilities for Three.js models.
	
	Provided under the MIT License
*/

THREE.CSG = {
	toCSG: function ( three_model, offset, rotation ) {
		var i, geometry, offset, polygons, vertices, rotation_matrix;
		
		if ( !CSG ) {
			throw 'CSG library not loaded. Please get a copy from https://github.com/evanw/csg.js';
		}
		
		if ( three_model instanceof THREE.Mesh ) {
			geometry = three_model.geometry;
			offset = offset || three_model.position;
			rotation = rotation || three_model.rotation;
		} else if ( three_model instanceof THREE.Geometry ) {
			geometry = three_model;
			offset = offset || new THREE.Vector3( 0, 0, 0 );
			rotation = rotation || new THREE.Vector3( 0, 0, 0 );
		} else {
			throw 'Model type not supported.';
		}
		rotation_matrix = new THREE.Matrix4( ).setRotationFromEuler( rotation );
		
		var polygons = [];
		for ( i = 0; i < geometry.faces.length; i++ ) {
			if ( geometry.faces[i] instanceof THREE.Face3 ) {
				
				
				vertices = [];
				vertices.push( new CSG.Vertex( rotation_matrix.multiplyVector3( geometry.vertices[geometry.faces[i].a].position.clone( ).addSelf( offset ) ), [ geometry.faces[i].normal.x, geometry.faces[i].normal.y, geometry.faces[i].normal.z ] ) );
				vertices.push( new CSG.Vertex( rotation_matrix.multiplyVector3( geometry.vertices[geometry.faces[i].b].position.clone( ).addSelf( offset ) ), [ geometry.faces[i].normal.x, geometry.faces[i].normal.y, geometry.faces[i].normal.z ] ) );
				vertices.push( new CSG.Vertex( rotation_matrix.multiplyVector3( geometry.vertices[geometry.faces[i].c].position.clone( ).addSelf( offset ) ), [ geometry.faces[i].normal.x, geometry.faces[i].normal.y, geometry.faces[i].normal.z ] ) );
				polygons.push( new CSG.Polygon( vertices ) );
				
			} else if ( geometry.faces[i] instanceof THREE.Face4 ) {
				
				vertices = [];
				vertices.push( new CSG.Vertex( rotation_matrix.multiplyVector3( geometry.vertices[geometry.faces[i].a].position.clone( ).addSelf( offset ) ), [ geometry.faces[i].normal.x, geometry.faces[i].normal.y, geometry.faces[i].normal.z ] ) );
				vertices.push( new CSG.Vertex( rotation_matrix.multiplyVector3( geometry.vertices[geometry.faces[i].b].position.clone( ).addSelf( offset ) ), [ geometry.faces[i].normal.x, geometry.faces[i].normal.y, geometry.faces[i].normal.z ] ) );
				vertices.push( new CSG.Vertex( rotation_matrix.multiplyVector3( geometry.vertices[geometry.faces[i].d].position.clone( ).addSelf( offset ) ), [ geometry.faces[i].normal.x, geometry.faces[i].normal.y, geometry.faces[i].normal.z ] ) );
				polygons.push( new CSG.Polygon( vertices ) );
				
				vertices = [];
				vertices.push( new CSG.Vertex( rotation_matrix.multiplyVector3( geometry.vertices[geometry.faces[i].b].position.clone( ).addSelf( offset ) ), [ geometry.faces[i].normal.x, geometry.faces[i].normal.y, geometry.faces[i].normal.z ] ) );
				vertices.push( new CSG.Vertex( rotation_matrix.multiplyVector3( geometry.vertices[geometry.faces[i].c].position.clone( ).addSelf( offset ) ), [ geometry.faces[i].normal.x, geometry.faces[i].normal.y, geometry.faces[i].normal.z ] ) );
				vertices.push( new CSG.Vertex( rotation_matrix.multiplyVector3( geometry.vertices[geometry.faces[i].d].position.clone( ).addSelf( offset ) ), [ geometry.faces[i].normal.x, geometry.faces[i].normal.y, geometry.faces[i].normal.z ] ) );
				polygons.push( new CSG.Polygon( vertices ) );
				
			} else {
				throw 'Model contains unsupported face.';
			}
		}
		
		return CSG.fromPolygons( polygons );
	},
	//This function is used to convert CSG objects to Three.js's  Mesh.
	fromCSG: function( csg_model ) {
		var i, j, vertices, face,
			three_geometry = new THREE.Geometry( ),
			polygons = csg_model.toPolygons( );

		if ( !CSG ) {
			throw 'CSG library not loaded. Please get a copy from https://github.com/evanw/csg.js';
		}

		//Default opacity for any face is 1 (opaque)
		var opacity = [1];
		for ( i = 0; i < polygons.length; i++ ) {
			// Vertices
			vertices = [];

			for ( j = 0; j < polygons[i].vertices.length; j++ ) {
				vertices.push( this.getGeometryVertex( three_geometry, polygons[i].vertices[j].pos ) );
			}

			if ( vertices[0] === vertices[vertices.length - 1] ) {
				vertices.pop( );
			}
			//Shared value of the color from the csg.js, used to define color of face here
			var polygonColor = polygons[i].shared.color;
			var faceOpacityIndex = 0;
			if (polygonColor != null){
				faceOpacityIndex = null;
				//Checks if the said opacity is there already, if not then a new element is pushed in
				//the opacity array and new index is assigned, if yes, then the previous index is assigned.
				for (var opacityIndex = 0; opacityIndex < opacity.length; opacityIndex++ ){
					if(polygonColor[3] == opacity[opacityIndex]){
						faceOpacityIndex = opacityIndex;
					}
				}
				if(faceOpacityIndex == null){
					if(polygonColor[3] <= 1) {
						opacity.push(polygonColor[3]);
						faceOpacityIndex = opacity.length -1;
					} else {
						console.log("wrong transparency argument");
						faceOpacityIndex = 0;
					}
				}
			} else{
				//default color is blue
				polygonColor = [0,0,1];
			}

			//defining faces here and setting their color along side.
			for (var k = 2; k < vertices.length; k++) {
				face = new THREE.Face3( vertices[0], vertices[k-1], vertices[k], new THREE.Vector3( ).copy( polygons[i].plane.normal), new THREE.Color(0,0,1), faceOpacityIndex );
				face.color.setRGB(polygonColor[0], polygonColor[1], polygonColor[2]);
				face.materialIndex = faceOpacityIndex;
				three_geometry.faces.push( face );
			}
		}
		//created a bounded box geometry from the vertices.
		three_geometry.computeBoundingBox();
		this.opacity = opacity;
		var result = [];
		//result contains the mesh as well the opacity array.
		result.push(three_geometry);
		result.push(this.opacity);
		return result;
	},
	
	getGeometryVertex: function ( geometry, vertex_position ) {
		var i;
		// If Vertex already exists
		//TODO improve this logic.
		for ( i = 0; i < geometry.vertices.length; i++ ) {
			if ( geometry.vertices[i].x === vertex_position.x &&
				geometry.vertices[i].y === vertex_position.y &&
				geometry.vertices[i].z === vertex_position.z ) {
				return i;
			}
		}
		geometry.vertices.push(new THREE.Vector3( vertex_position.x, vertex_position.y, vertex_position.z ) );
		return geometry.vertices.length - 1;
	}
};