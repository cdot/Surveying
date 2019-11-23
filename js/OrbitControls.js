define("js/OrbitControls", ["three"], function(THREE) {

    // const changeEvent = { type: 'change' };
    // const startEvent = { type: 'start' };
    // const endEvent = { type: 'end' };

    const STATE = {
	NONE: -1,
	ROTATE: 0,
	DOLLY: 1,
	PAN: 2,
	TOUCH_ROTATE: 3,
	TOUCH_PAN: 4,
	TOUCH_DOLLY_PAN: 5,
	TOUCH_DOLLY_ROTATE: 6
    };

    const EPS = 0.000001;

    class OrbitControls {

        constructor(object, domElement) {

            // Internals
            
            // current position in spherical coordinates
            this.spherical = new THREE.Spherical();
            this.sphericalDelta = new THREE.Spherical();
            this.scale = 1;
            this.panOffset = new THREE.Vector3();
            this.zoomChanged = false;

            this.rotateStart = new THREE.Vector2();
            this.rotateEnd = new THREE.Vector2();
            this.rotateDelta = new THREE.Vector2();

            this.panStart = new THREE.Vector2();
            this.panEnd = new THREE.Vector2();
            this.panDelta = new THREE.Vector2();

            this.dollyStart = new THREE.Vector2();
            this.dollyEnd = new THREE.Vector2();
            this.dollyDelta = new THREE.Vector2();

            this.state = STATE.NONE;

            // Public

            /**
             * @public
             * The camera to be controlled. The camera must not be a
             * child of another object, unless that object is the
             * scene itself.
             */
            this.object = object;

            /**
             * @public
             * The DOM element used for event listeners.
             */
            this.domElement = domElement;

            /**
             * @public Set to false to disable this control
             */
            this.enabled = true;

            /**
             * @public "target" sets the location of focus, where the object
             * orbits around
             */
            this.target = new THREE.Vector3();

            /**
             * @public How far you can dolly in and out (PerspectiveCamera only)
             */
            this.minDistance = 0;
            this.maxDistance = Infinity;

            /**
             * @public How far you can zoom in and out (OrthographicCamera only)
             */
            this.minZoom = 0;
            this.maxZoom = Infinity;

            /**
             * @public How far you can orbit vertically, upper and lower limits.
             * Range is 0 to Math.PI radians.
             */
            this.minPolarAngle = 0; // radians
            this.maxPolarAngle = Math.PI; // radians

            /**
             * @public How far you can orbit horizontally, upper and
             * lower limits.  If set, must be a sub-interval of the
             * interval [ -Math.PI, Math.PI ].
             */
            this.minAzimuthAngle = - Infinity; // radians
            this.maxAzimuthAngle = Infinity; // radians

            /**
             * @public Set to true to enable damping (inertia) If
             * damping is enabled, you must call controls.update() in
             * your animation loop
             */
            this.enableDamping = false;
            this.dampingFactor = 0.05;

            /**
             * @public This option actually enables dollying in and
             * out; left as "zoom" for backwards compatibility.  Set
             * to false to disable zooming
             */
            this.enableZoom = true;
            /**
             * @public
             * Speed of zooming. Default is 1.
             */
            this.zoomSpeed = 1.0;

            /**
             * @public Set to false to disable rotating
             */
            this.enableRotate = true;
            /**
             * @public
             * Speed of rotation. Default is 1.
             */
            this.rotateSpeed = 1.0;

            /**
             * @public Set to false to disable panning
             */
            this.enablePan = true;
            /**
             * @public
             * Speed of panning. Default is 1.
             */
            this.panSpeed = 1.0;
            /**
             * @public
             * Defines how the camera's position is translated when
             * panning. If true, the camera pans in screen
             * space. Otherwise, the camera pans in the plane
             * orthogonal to the camera's up direction. Default is
             * false.
             */
            this.screenSpacePanning = false; // if true, pan in screen-space
            /**
             * @public
             * How fast to pan the camera when the keyboard is
             * used. Default is 7.0 pixels per keypress.
             */
            this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

            /**
             * @public
             * Set to true to automatically rotate around the target
             * If auto-rotate is enabled, you must call
             * controls.update() in your animation loop
            */
            this.autoRotate = false;
            this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

            /**
             * @public
             * Set to false to disable use of the keys
             */
            this.enableKeys = true;

            /**
             * @public
             * The four arrow keys
             */
            this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

            /**
             * @public
             * Mouse buttons
             */
            this.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            };

            /**
             * @public
             * Touch fingers
             */
            this.touches = {
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN
            };

            // for reset
            this.target0 = this.target.clone();
            this.position0 = this.object.position.clone();
            this.zoom0 = this.object.zoom;

            this._bindEventHandlers();
        }
        
        /**
         * @public
         * Get the current vertical rotation, in radians
         */
        getPolarAngle() {
	    return this.spherical.phi;
        }

        /**
         * @public
         * Get the current horizontal rotation, in radians.
         */
        getAzimuthalAngle() {
	    return this.spherical.theta;
        }

        /**
         * @public
         * Save the current state of the controls. This can later be
         * recovered with .reset.
         */
        saveState() {
	    this.target0.copy(this.target);
	    this.position0.copy(this.object.position);
	    this.zoom0 = this.object.zoom;
        }

        /**
         * @public
         * Reset the controls to their state from either the last time
         * the .saveState was called, or the initial state
         */
        reset() {
	    this.target.copy(this.target0);
	    this.object.position.copy(this.position0);
	    this.object.zoom = this.zoom0;

	    this.object.updateProjectionMatrix();
	    //this.dispatchEvent(changeEvent);

	    this.update();

	    this.state = STATE.NONE;
        }

        /**
         * @public
         * Update the controls. Must be called after any manual
         * changes to the camera's transform, or in the update loop if
         * .autoRotate or .enableDamping are set.Public
         */
        update() {
	    let offset = new THREE.Vector3();

	    // so camera.up is the orbit axis
	    let quat = new THREE.Quaternion().setFromUnitVectors(this.object.up, new THREE.Vector3(0, 1, 0));
	    let quatInverse = quat.clone().inverse();

	    let lastPosition = new THREE.Vector3();
	    let lastQuaternion = new THREE.Quaternion();

	    let position = this.object.position;
	    offset.copy(position).sub(this.target);
	    // rotate offset to "y-axis-is-up" space
	    offset.applyQuaternion(quat);
	    // angle from z-axis around y-axis
	    this.spherical.setFromVector3(offset);
	    if (this.autoRotate && this.state === STATE.NONE) {
		this.rotateLeft(this._getAutoRotationAngle());
	    }

	    if (this.enableDamping) {
		this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
		this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
	    } else {
	        this.spherical.theta += this.sphericalDelta.theta;
		this.spherical.phi += this.sphericalDelta.phi;
	    }

	    // restrict theta to be between desired limits
	    this.spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, this.spherical.theta));

	    // restrict phi to be between desired limits
	    this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));

	    this.spherical.makeSafe();
            
	    this.spherical.radius *= this.scale;

	    // restrict radius to be between desired limits
	    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

	    // move target to panned location

	    if (this.enableDamping === true) {
		this.target.addScaledVector(this.panOffset, this.dampingFactor);
	    } else {
		this.target.add(this.panOffset);
	    }

	    offset.setFromSpherical(this.spherical);

	    // rotate offset back to "camera-up-vector-is-up" space
	    offset.applyQuaternion(quatInverse);
	    position.copy(this.target).add(offset);
	    this.object.lookAt(this.target);
	    if (this.enableDamping === true) {
		this.sphericalDelta.theta *= (1 - this.dampingFactor);
		this.sphericalDelta.phi *= (1 - this.dampingFactor);
		this.panOffset.multiplyScalar(1 - this.dampingFactor);
	    } else {
		this.sphericalDelta.set(0, 0, 0);
		this.panOffset.set(0, 0, 0);
	    }

	    this.scale = 1;

	    // update condition is:
	    // min(camera displacement, camera rotation in radians)^2 > EPS
	    // using small-angle approximation cos(x/2) = 1 - x^2 / 8

	    if (this.zoomChanged ||
		 lastPosition.distanceToSquared(this.object.position) > EPS ||
		 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS) {

		//this.dispatchEvent(changeEvent);

		lastPosition.copy(this.object.position);
		lastQuaternion.copy(this.object.quaternion);
		this.zoomChanged = false;
		return true;
	    }
	    return false;
	}

        /**
         * @public
         * Detach event handlers
         */
        dispose() {
            let $el = $(this.domElement);
            $el.off('contextmenu');
	    $el.off('mousedown');
	    $el.off('wheel');

	    $el.off('touchstart');
	    $el.off('touchend');
	    $el.off('touchmove');

	    $(document).off('mousemove');
	    $(document).off('mouseup');

	    $el.off('keydown');

	    //this.dispatchEvent({ type: 'dispose' }); // should this be added here?
        }

        _getAutoRotationAngle() {
	    return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
        }

        _getZoomScale() {
	    return Math.pow(0.95, this.zoomSpeed);
        }

        _rotateLeft(angle) {
	    this.sphericalDelta.theta -= angle;
        }

        _rotateUp(angle) {
	    this.sphericalDelta.phi -= angle;
        }

	_panLeft(distance, objectMatrix) {
	    let v = new THREE.Vector3();
	    v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
	    v.multiplyScalar(- distance);
	    this.panOffset.add(v);
	}

	_panUp(distance, objectMatrix) {
	    let v = new THREE.Vector3();
	    if (this.screenSpacePanning === true) {
		v.setFromMatrixColumn(objectMatrix, 1);
	    } else {
		v.setFromMatrixColumn(objectMatrix, 0);
	        v.crossVectors(this.object.up, v);
	    }
	    v.multiplyScalar(distance);
	    this.panOffset.add(v);
	}

        // deltaX and deltaY are in pixels; right and down are positive
	_pan(deltaX, deltaY) {
	    let offset = new THREE.Vector3();
	    let element = this.domElement;
	    if (this.object.isPerspectiveCamera) {
		// perspective
		let position = this.object.position;
		offset.copy(position).sub(this.target);
		let targetDistance = offset.length();

		// half of the fov is center to top of screen
		targetDistance *= Math.tan((this.object.fov / 2)
                                           * Math.PI / 180.0);

		// we use only clientHeight here so aspect ratio does not distort speed
		this._panLeft(2 * deltaX * targetDistance / element.clientHeight,
                        this.object.matrix);
		this._panUp(2 * deltaY * targetDistance / element.clientHeight,
                      this.object.matrix);

	    } else if (this.object.isOrthographicCamera) {
		// orthographic
		this._panLeft(deltaX * (this.object.right - this.object.left) /
                        this.object.zoom / element.clientWidth,
                        this.object.matrix);
		this._panUp(deltaY * (this.object.top - this.object.bottom) /
                      this.object.zoom / element.clientHeight,
                      this.object.matrix);
	    } else {
		// camera neither orthographic nor perspective
		console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
		this.enablePan = false;
	    }
	}

        _dollyIn(dollyScale) {
	    if (this.object.isPerspectiveCamera) {
	        this.scale /= dollyScale;
	    } else if (this.object.isOrthographicCamera) {
	        this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom * dollyScale));
	        this.object.updateProjectionMatrix();
	        this.zoomChanged = true;
	    } else {
	        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
	        this.enableZoom = false;
	    }
        }

        _dollyOut(dollyScale) {
	    if (this.object.isPerspectiveCamera) {
	        this.scale *= dollyScale;
	    } else if (this.object.isOrthographicCamera) {
	        this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / dollyScale));
	        this.object.updateProjectionMatrix();
	        this.zoomChanged = true;
	    } else {
	        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
	        this.enableZoom = false;
	    }
        }

        //
        // event callbacks - update the object state
        //

        _handleMouseDownRotate(event) {
	    this.rotateStart.set(event.clientX, event.clientY);
        }

        _handleMouseDownDolly(event) {
	    this.dollyStart.set(event.clientX, event.clientY);
        }

        _handleMouseDownPan(event) {
	    this.panStart.set(event.clientX, event.clientY);
        }

        _handleMouseMoveRotate(event) {
	    this.rotateEnd.set(event.clientX, event.clientY);
	    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);

	    let element = this.domElement;
	    this._rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight); // yes, height
	    this._rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);
	    this.rotateStart.copy(this.rotateEnd);
	    this.update();
        }

        _handleMouseMoveDolly(event) {
	    this.dollyEnd.set(event.clientX, event.clientY);
	    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
	    if (this.dollyDelta.y > 0) {
	        this._dollyIn(this._getZoomScale());
	    } else if (this.dollyDelta.y < 0) {
	        this._dollyOut(this._getZoomScale());
	    }
	    this.dollyStart.copy(this.dollyEnd);
	    this.update();
        }

        _handleMouseMovePan(event) {
	    this.panEnd.set(event.clientX, event.clientY);
	    this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
	    this._pan(this.panDelta.x, this.panDelta.y);
	    this.panStart.copy(this.panEnd);
	    this.update();
        }

        _handleMouseUp(/*event*/) {
	    // no-op
        }

        _handleMouseWheel(event) {
	    if (event.deltaY < 0) {
	        this._dollyOut(this._getZoomScale());
	    } else if (event.deltaY > 0) {
	        this._dollyIn(this._getZoomScale());
	    }
	    this.update();
        }

        _handleKeyDown(event) {
	    let needsUpdate = false;
	    switch (event.keyCode) {
	    case this.keys.UP:
	        this._pan(0, this.keyPanSpeed);
	        needsUpdate = true;
	        break;
	    case this.keys.BOTTOM:
	        this._pan(0, - this.keyPanSpeed);
	        needsUpdate = true;
	        break;
	    case this.keys.LEFT:
	        this._pan(this.keyPanSpeed, 0);
	        needsUpdate = true;
	        break;
	    case this.keys.RIGHT:
	        this._pan(- this.keyPanSpeed, 0);
	        needsUpdate = true;
	    break;
	    }

	    if (needsUpdate) {
	        // prevent the browser from scrolling on cursor keys
	        event.preventDefault();
	        this.update();
	    }
        }

        _handleTouchStartRotate(event) {
	    if (event.touches.length == 1) {
	        this.rotateStart.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
	    } else {
	        let x = 0.5 * (event.touches[ 0 ].pageX + event.touches[ 1 ].pageX);
	        let y = 0.5 * (event.touches[ 0 ].pageY + event.touches[ 1 ].pageY);
	        this.rotateStart.set(x, y);
	    }
        }

        _handleTouchStartPan(event) {
	    if (event.touches.length == 1) {
	        this.panStart.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
	    } else {
	        let x = 0.5 * (event.touches[ 0 ].pageX + event.touches[ 1 ].pageX);
                let y = 0.5 * (event.touches[ 0 ].pageY + event.touches[ 1 ].pageY);
	        this.panStart.set(x, y);
	    }
        }

        _handleTouchStartDolly(event) {
	    let dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
	    let dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
	    let distance = Math.sqrt(dx * dx + dy * dy);
	    this.dollyStart.set(0, distance);
        }

        _handleTouchStartDollyPan(event) {
	    if (this.enableZoom) this._handleTouchStartDolly(event);
	    if (this.enablePan) this._handleTouchStartPan(event);
        }

        _handleTouchStartDollyRotate(event) {
	    if (this.enableZoom) this._handleTouchStartDolly(event);
	    if (this.enableRotate) this._handleTouchStartRotate(event);
        }

        _handleTouchMoveRotate(event) {
	    if (event.touches.length == 1) {
	        this.rotateEnd.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
	    } else {
	        let x = 0.5 * (event.touches[ 0 ].pageX + event.touches[ 1 ].pageX);
	        let y = 0.5 * (event.touches[ 0 ].pageY + event.touches[ 1 ].pageY);
	        this.rotateEnd.set(x, y);
	    }

	    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);
            let element = this.domElement;

	    this._rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight); // yes, height
	    this._rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);
	    this.rotateStart.copy(this.rotateEnd);
        }

        _handleTouchMovePan(event) {
	    if (event.touches.length == 1) {
	        this.panEnd.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
	    } else {
	        let x = 0.5 * (event.touches[ 0 ].pageX + event.touches[ 1 ].pageX);
	        let y = 0.5 * (event.touches[ 0 ].pageY + event.touches[ 1 ].pageY);
	        this.panEnd.set(x, y);
	    }

	    this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
	    this._pan(this.panDelta.x, this.panDelta.y);
	    this.panStart.copy(this.panEnd);
        }

        _handleTouchMoveDolly(event) {
	    let dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
	    let dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
	    let distance = Math.sqrt(dx * dx + dy * dy);
	    this.dollyEnd.set(0, distance);
	    this.dollyDelta.set(0, Math.pow(this.dollyEnd.y / this.dollyStart.y, this.zoomSpeed));
	    this._dollyIn(this.dollyDelta.y);
	    this.dollyStart.copy(this.dollyEnd);
        }

        _handleTouchMoveDollyPan(event) {
	    if (this.enableZoom) this._handleTouchMoveDolly(event);
	    if (this.enablePan) this._handleTouchMovePan(event);
        }

        _handleTouchMoveDollyRotate(event) {
	    if (this.enableZoom) this._handleTouchMoveDolly(event);
	    if (this.enableRotate) this._handleTouchMoveRotate(event);
        }

        _handleTouchEnd(/*event*/) {
	    // no-op
        }

        _bindEventHandlers() {
            let $el = $(this.domElement);
            let self = this;
            
            $el.on("mousedown", (event) => {
	        if (self.enabled === false) return;
	        // Prevent the browser from scrolling.
	        event.preventDefault();
	        // Manually set the focus since calling preventDefault above
	        // prevents the browser from setting it automatically.
	        self.domElement.focus ? self.domElement.focus() : window.focus();
	        switch (event.button) {
	        case 0:
	            switch (self.mouseButtons.LEFT) {
	            case THREE.MOUSE.ROTATE:
		        if (event.ctrlKey || event.metaKey || event.shiftKey) {
		            if (self.enablePan === false) return;
		            self._handleMouseDownPan(event);
		            self.state = STATE.PAN;
		        } else {
		            if (self.enableRotate === false) return;
		            self._handleMouseDownRotate(event);
		            self.state = STATE.ROTATE;
		        }
		        break;

	            case THREE.MOUSE.PAN:
		        if (event.ctrlKey || event.metaKey || event.shiftKey) {
		            if (self.enableRotate === false) return;
		            self._handleMouseDownRotate(event);
		            self.state = STATE.ROTATE;
		        } else {
		            if (self.enablePan === false) return;
		            self._handleMouseDownPan(event);
		            self.state = STATE.PAN;
		        }
		        break;

	            default:
		        self.state = STATE.NONE;
	            }
	            break;

	        case 1:
	            switch (self.mouseButtons.MIDDLE) {
	            case THREE.MOUSE.DOLLY:
		        if (self.enableZoom === false) return;
		        self._handleMouseDownDolly(event);
		        self.state = STATE.DOLLY;
		        break;
                        
	            default:
		        self.state = STATE.NONE;
	            }
	            break;

	        case 2:
	            switch (self.mouseButtons.RIGHT) {
	            case THREE.MOUSE.ROTATE:
		        if (self.enableRotate === false) return;
		        self._handleMouseDownRotate(event);
		        self.state = STATE.ROTATE;
		        break;

	            case THREE.MOUSE.PAN:
		        if (self.enablePan === false) return;
		        self._handleMouseDownPan(event);
		        self.state = STATE.PAN;
		        break;

	            default:
		        self.state = STATE.NONE;
	            }
	            break;
	        }

	        if (self.state !== STATE.NONE) {
	            $(document).on('mousemove',
                                   event => { self.onMouseMove(event); }, false);
	            $(document).on('mouseup',
                                   event => { self.onMouseUp(event); }, false);
	            //self.dispatchEvent(startEvent);
	        }
            });

            $el.on("mousemove", (event) => {
	        if (self.enabled === false) return;
	        event.preventDefault();
	        switch (self.state) {
	        case STATE.ROTATE:
	            if (self.enableRotate === false) return;
	            self._handleMouseMoveRotate(event);
	            break;

	        case STATE.DOLLY:
	            if (self.enableZoom === false) return;
	            self._handleMouseMoveDolly(event);
	            break;

	        case STATE.PAN:
	            if (self.enablePan === false) return;
	            self._handleMouseMovePan(event);
	            break;
	        }
            });

            $el.on("mouseup", (event) => {
	        if (self.enabled === false) return;
	        self._handleMouseUp(event);
	        //self.dispatchEvent(endEvent);
	        self.state = STATE.NONE;
            });

            $el.on("wheel", (event) => {
	        if (self.enabled === false || self.enableZoom === false
                    || (self.state !== STATE.NONE
                        && self.state !== STATE.ROTATE))
                    return;
	        event.preventDefault();
	        event.stopPropagation();
	        //self.dispatchEvent(startEvent);
	        self._handleMouseWheel(event);
	        //self.dispatchEvent(endEvent);
            });

            $el.on("keydown", (event) => {
	        if (self.enabled === false || self.enableKeys === false
                    || self.enablePan === false)
                    return;
	        self._handleKeyDown(event);
            });

            $el.on("touchstart", (event) => {
	        if (self.enabled === false) return;
	        event.preventDefault();
	        switch (event.touches.length) {
	        case 1:
	            switch (self.touches.ONE) {
	            case THREE.TOUCH.ROTATE:
		        if (self.enableRotate === false) return;
		        self._handleTouchStartRotate(event);
		        self.state = STATE.TOUCH_ROTATE;
		        break;

	            case THREE.TOUCH.PAN:
		        if (self.enablePan === false) return;
		        self._handleTouchStartPan(event);
		        self.state = STATE.TOUCH_PAN;
		        break;

	            default:
		        self.state = STATE.NONE;
	            }
	            break;
                case 2:
	            switch (self.touches.TWO) {
	            case THREE.TOUCH.DOLLY_PAN:
		        if (self.enableZoom === false && self.enablePan === false) return;
		        self._handleTouchStartDollyPan(event);
		        self.state = STATE.TOUCH_DOLLY_PAN;
		        break;

	            case THREE.TOUCH.DOLLY_ROTATE:
		        if (self.enableZoom === false && self.enableRotate === false) return;
		        self._handleTouchStartDollyRotate(event);
		        self.state = STATE.TOUCH_DOLLY_ROTATE;
		        break;

	            default:
		        self.state = STATE.NONE;
	            }
	            break;

	        default:
	            self.state = STATE.NONE;
	        }

	        if (self.state !== STATE.NONE) {
	            //self.dispatchEvent(startEvent);
	        }
            });

            $el.on("touchmove", (event) => {
	        if (self.enabled === false) return;
	        event.preventDefault();
	        event.stopPropagation();
	        switch (self.state) {
	        case STATE.TOUCH_ROTATE:
	            if (self.enableRotate === false) return;
	            self._handleTouchMoveRotate(event);
	            self.update();
	            break;
	        case STATE.TOUCH_PAN:
	            if (self.enablePan === false) return;
                    self._handleTouchMovePan(event);
	            self.update();
	            break;
	        case STATE.TOUCH_DOLLY_PAN:
	            if (self.enableZoom === false && self.enablePan === false) return;
	            self._handleTouchMoveDollyPan(event);
	            self.update();
	            break;
	        case STATE.TOUCH_DOLLY_ROTATE:
	            if (self.enableZoom === false && self.enableRotate === false) return;
	            self._handleTouchMoveDollyRotate(event);
	            self.update();
	            break;
	        default:
	            self.state = STATE.NONE;
	        }
            });

            $el.on("touchend", (event) => {
	        if (self.enabled === false) return;
	        self._handleTouchEnd(event);
	        //self.dispatchEvent(endEvent);
	        self.state = STATE.NONE;
            });

            $el.on("contextmenu", (event) => {
	        if (self.enabled === false) return;
	        event.preventDefault();
            })

            // make sure element can receive keys.
            if (self.domElement.tabIndex === -1)
	        self.domElement.tabIndex = 0;
        }
    }
/*
    // This set of controls performs orbiting, dollying (zooming), and panning.
    // Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
    // This is very similar to OrbitControls, another set of touch behavior
    //
    //    Orbit - right mouse, or left mouse + ctrl/meta/shiftKey / touch: two-finger rotate
    //    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
    //    Pan - left mouse, or arrow keys / touch: one-finger move

    let MapControls = function (object, domElement) {

	OrbitControls.call(this, object, domElement);

	this.mouseButtons.LEFT = THREE.MOUSE.PAN;
	this.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;

	this.touches.ONE = THREE.TOUCH.PAN;
	this.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

    };

    MapControls.prototype = Object.create(THREE.EventDispatcher.prototype);
    MapControls.prototype.constructor = MapControls;
*/
    return OrbitControls;
});
