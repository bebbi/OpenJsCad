/*
 2013-07-23 @betolink
 Modified from TrackBallControls to handle Three.js r59 API and not whole DOM attachment.
 Licensed under WTFPL
 http://www.wtfpl.net/txt/copying/
 */

THREE.TrackballControl = function ( object, domElement ) {
	var _this = this,
		STATE = { NONE : -1, ROTATE : 0, ZOOM : 1, PAN : 2 };
	this.object = object;
//API
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	this.enabled = true;
	this.rotateSpeed = 1.0;
	this.zoomSpeed = 1.2;
	this.panSpeed = 0.3;
	this.noRotate = false;
	this.noZoom = false;
	this.noPan = false;
	this.staticMoving = false;
	this.dynamicDampingFactor = 0.2;
	this.minDistance = 10;
	this.maxDistance = 1000;
	this.keys = [ 97 /*a*/, 115 /*s*/, 100 /*d*/ ];
	this.ismine = true;
//API ENDS
	this.target = new THREE.Vector3( 0, 0, 0 );
	var _keyPressed = false,
		_state = STATE.NONE,
		_prevState = STATE.NONE,
		_eye = new THREE.Vector3(),
		_rotateStart = new THREE.Vector3(),
		_rotateEnd = new THREE.Vector3(),
		_zoomStart = new THREE.Vector2(),
		_zoomEnd = new THREE.Vector2(),
		_panStart = new THREE.Vector2(),
		_panEnd = new THREE.Vector2();
	_initialState = true;
	this.relocate = function(event) {
		var elem = _this.domElement;
		var tdeLeftOffset = elem.offsetLeft;
		var tdeTopOffset = elem.offsetTop;
		while (elem = elem.offsetParent)
		{
			tdeLeftOffset += elem.offsetLeft;
			tdeTopOffset += elem.offsetTop;
		}
		_this.screen = {
			width: _this.domElement.clientWidth,
			height: _this.domElement.clientHeight,
			offsetLeft: tdeLeftOffset - window.pageXOffset,
			offsetTop: tdeTopOffset - window.pageYOffset
		};
	};

	this.first_relocate = function(event) {
		_initialState = false;
		this.relocate();
		_this.radius = (_this.screen.width + _this.screen.height ) / 4;
	};

	this.handleEvent = function ( event ) {
		if ( typeof this[ event.type ] == 'function' ) {
			this[ event.type ]( event );
		}
	};

	this.getMouseOnScreen = function( clientX, clientY ) {
		if ( _this.screen !== undefined ) {
			return new THREE.Vector2( ( clientX - _this.screen.offsetLeft ) / _this.radius * 0.5,
				( clientY - _this.screen.offsetTop ) / _this.radius * 0.5 );
		}
		return;
	};

	this.getMouseProjectionOnBall = function( clientX, clientY ) {
		if (_this.screen === undefined) return;
		var projection, mouseOnBall = new THREE.Vector3(
				( clientX - _this.screen.width * 0.5 - _this.screen.offsetLeft ) / _this.radius,
				( _this.screen.height * 0.5 + _this.screen.offsetTop - clientY ) / _this.radius, 0.0),
			length = mouseOnBall.length();
		if ( length > 1.0 ) {
			mouseOnBall.normalize();
		} else {
			mouseOnBall.z = Math.sqrt( 1.0 - length * length );
		}
		_eye.copy( _this.object.position ).sub( _this.target );
		projection = _this.object.up.clone().setLength( mouseOnBall.y );
		projection.add( _this.object.up.clone().cross( _eye ).setLength( mouseOnBall.x ) );
		projection.add( _eye.setLength( mouseOnBall.z ) );
		return projection;
	};

	this.rotateCamera = function() {
		var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );
		if ( angle ) {
			var axis = ( new THREE.Vector3() ).crossVectors( _rotateStart, _rotateEnd ).normalize(),
				quaternion = new THREE.Quaternion();
			angle *= _this.rotateSpeed;
			quaternion.setFromAxisAngle( axis, -angle );
			_eye.applyQuaternion(quaternion);
			_this.object.up.applyQuaternion(quaternion);
			_rotateEnd.applyQuaternion(quaternion);
			if ( _this.staticMoving ) {
				_rotateStart = _rotateEnd;
			} else {
				quaternion.setFromAxisAngle( axis, angle * ( _this.dynamicDampingFactor - 1.0 ) );
				_rotateStart.applyQuaternion(quaternion);
			}
		}
	};

	this.zoomCamera = function() {
		if (_zoomStart === undefined) return;
		var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;
		if ( factor !== 1.0 && factor > 0.0 ) {
			_eye.multiplyScalar( factor );
			if ( _this.staticMoving ) {
				_zoomStart = _zoomEnd;
			} else {
				_zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;
			}
		}
	};

	this.panCamera = function () {
		var mouseChange = _panEnd.clone().sub( _panStart );
		if ( mouseChange.lengthSq() ) {
			mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );
			var pan = _eye.clone().cross( _this.object.up ).setLength( mouseChange.x );
			pan.add( _this.object.up.clone().setLength( mouseChange.y ) );
			_this.object.position.add( pan );
			_this.target.add( pan );
			if ( _this.staticMoving ) {
				_panStart = _panEnd;
			} else {
				_panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );
			}
		}
	};

	this.checkDistances = function() {
		if ( !_this.noZoom || !_this.noPan ) {
			if ( _this.object.position.lengthSq() > _this.maxDistance * _this.maxDistance ) {
				_this.object.position.setLength( _this.maxDistance );
			}
			if ( _eye.lengthSq() < _this.minDistance * _this.minDistance ) {
				_this.object.position.addVectors( _this.target, _eye.setLength( _this.minDistance ) );
			}
		}
	};

	this.update = function() {
		_eye.copy( _this.object.position ).sub( this.target );
		if ( !_this.noRotate ) {
			_this.rotateCamera();
		}
		if ( !_this.noZoom ) {
			_this.zoomCamera();
		}
		if ( !_this.noPan ) {
			_this.panCamera();
		}
		_this.object.position.addVectors( _this.target, _eye );
		_this.checkDistances();
		_this.object.lookAt( _this.target );
	};

	this.reset = function () {
		_state = STATE.NONE;
		_prevState = STATE.NONE;
		_this.target.copy( _this.target0 );
		_this.object.position.copy( _this.position0 );
		_this.object.up.copy( _this.up0 );
		_eye.subVectors( _this.object.position, _this.target );
		_this.object.lookAt( _this.target );
		_this.dispatchEvent( changeEvent );
		lastPosition.copy( _this.object.position );
	};

// listeners

	function keydown( event ) {
		if ( _this.enabled === false ) return;
		window.removeEventListener( 'keydown', keydown );
		_prevState = _state;
		if ( _state !== STATE.NONE ) {
			return;
		} else if ( event.keyCode === _this.keys[ STATE.ROTATE ] && !_this.noRotate ) {
			_state = STATE.ROTATE;
		} else if ( event.keyCode === _this.keys[ STATE.ZOOM ] && !_this.noZoom ) {
			_state = STATE.ZOOM;
		} else if ( event.keyCode === _this.keys[ STATE.PAN ] && !_this.noPan ) {
			_state = STATE.PAN;
		}
	};

	function keyup( event ) {
		if ( _this.enabled === false ) return;
		_state = _prevState;
		window.addEventListener( 'keydown', keydown, false );
	};

	function mousedown( event ) {
		if(_initialState) _this.first_relocate();
		if ( ! _this.enabled ) return;
		event.preventDefault();
		event.stopPropagation();
		if ( _state === STATE.NONE ) {
			_state = event.button;
			if ( _state === STATE.ROTATE && !_this.noRotate ) {
				_rotateStart = _rotateEnd = _this.getMouseProjectionOnBall( event.clientX, event.clientY );
			} else if ( _state === STATE.ZOOM && !_this.noZoom ) {
				_zoomStart = _zoomEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
			} else if ( !this.noPan ) {
				_panStart = _panEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
			}
		}
	};

	function mousewheel( event ) {
		if ( _this.enabled === false ) return;
		event.preventDefault();
		event.stopPropagation();
		var delta = 0;
		if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9
			delta = event.wheelDelta / 40;
		} else if ( event.detail ) { // Firefox
			delta = - event.detail / 3;
		}
		_zoomStart.y += delta * 0.01;
	};

	function mousemove( event ) {
		if ( ! _this.enabled ) return;

		if ( _keyPressed ) {
			_rotateStart = _rotateEnd = _this.getMouseProjectionOnBall( event.clientX, event.clientY );
			_zoomStart = _zoomEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
			_panStart = _panEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
			_keyPressed = false;
		}

		if ( _state === STATE.NONE ) {
			return;
		} else if ( _state === STATE.ROTATE && !_this.noRotate ) {
			_rotateEnd = _this.getMouseProjectionOnBall( event.clientX, event.clientY );
		} else if ( _state === STATE.ZOOM && !_this.noZoom ) {
			_zoomEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
		} else if ( _state === STATE.PAN && !_this.noPan ) {
			_panEnd = _this.getMouseOnScreen( event.clientX, event.clientY );
		}
	};

	function mouseup( event ) {
		if ( ! _this.enabled ) return;
		event.preventDefault();
		event.stopPropagation();
		_state = STATE.NONE;
	};

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousemove', mousemove, false );
	this.domElement.addEventListener( 'mousedown', mousedown, false );
	this.domElement.addEventListener( 'mouseup', mouseup, false );
	this.domElement.addEventListener( 'mousewheel', mousewheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

	window.addEventListener( 'keydown', keydown, false );
	window.addEventListener( 'keyup', keyup, false );
	window.addEventListener('resize', this.relocate, false);
}; 