/* eslint-env jquery, browser */
define("js/OrbitControls", ["three"], function(Three) {

    /**
     * OrbitControls rewritten as a class
     */
    
    // const changeEvent = { type: 'change' };
    // const startEvent = { type: 'start' };
    // const endEvent = { type: 'end' };

    const STATE = {
        NONE: "none",
        ROTATE: "rotate",
        DOLLY: "dolly",
        PAN: "pan",
        TOUCH_ROTATE: "touch rotate",
        TOUCH_PAN: "touch pan",
        TOUCH_DOLLY_PAN: "touch dolly pan",
        TOUCH_DOLLY_ROTATE: "touch dolly rotate"
    };

    const EPS = 0.000001;

    class OrbitControls {

        constructor(object, domElement) {

            // Internals
            
            // current position in spherical coordinates
            this.mSpherical = new Three.Spherical();
            this.mSphericalDelta = new Three.Spherical();
            this.mScale = 1;
            this.mPanOffset = new Three.Vector3();
            this.mZoomChanged = false;

            this.mRotateStart = new Three.Vector2();
            this.mRotateEnd = new Three.Vector2();
            this.mRotateDelta = new Three.Vector2();

            this.mPanStart = new Three.Vector2();
            this.mPanEnd = new Three.Vector2();
            this.mPanDelta = new Three.Vector2();

            this.mDollyStart = new Three.Vector2();
            this.mDollyEnd = new Three.Vector2();
            this.mDollyDelta = new Three.Vector2();

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
            this.target = new Three.Vector3();

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
            this.minAzimuthAngle = -Infinity; // radians
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
             * out.  Set to false to disable dollying
             */
            this.enableDollying = true;
            
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
            this.keyPanSpeed = 7.0;

            /**
             * @public
             * Set to true to automatically rotate around the target
             * If auto-rotate is enabled, you must call
             * controls.update() in your animation loop
            */
            this.autoRotate = false;
            // 30 seconds per round when fps is 60
            this.autoRotateSpeed = 2.0;

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
             * Mouse buttons. Default is:
             * Left mouse: rotate
             * Middle mouse: dolly (zoom)
             * Right mouse: pan
             */
            this.mouseButtons = {
                LEFT: Three.MOUSE.ROTATE,
                MIDDLE: Three.MOUSE.DOLLY,
                RIGHT: Three.MOUSE.PAN
            };

            /**
             * @public
             * Touch fingers. Default is:
             * One finger touching: rotate
             * Two fingers touching: pan
             */
            this.touches = {
                ONE: Three.TOUCH.ROTATE,
                TWO: Three.TOUCH.DOLLY_PAN
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
            return this.mSpherical.phi;
        }

        /**
         * @public
         * Get the current horizontal rotation, in radians.
         */
        getAzimuthalAngle() {
            return this.mSpherical.theta;
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
            this.update();

            this.state = STATE.NONE;
        }

        set state(s) {
            // console.log(`State ${s}`);
            this.mState = s;
        }

        get state() {
            return this.mState;
        }
        
        /**
         * @public
         * Update the controls. Must be called after any manual
         * changes to the camera's transform, or in the update loop if
         * .autoRotate or .enableDamping are set.Public
         */
        update() {
            let offset = new Three.Vector3();

            // so camera.up is the orbit axis
            let quat = new Three.Quaternion().setFromUnitVectors(
                this.object.up, new Three.Vector3(0, 1, 0));
            let quatInverse = quat.clone().inverse();

            let lastPosition = new Three.Vector3();
            let lastQuaternion = new Three.Quaternion();

            let position = this.object.position;
            offset.copy(position).sub(this.target);
            // rotate offset to "y-axis-is-up" space
            offset.applyQuaternion(quat);
            // angle from z-axis around y-axis
            this.mSpherical.setFromVector3(offset);
            if (this.autoRotate && this.state === STATE.NONE) {
                this.rotateLeft(this._getAutoRotationAngle());
            }

            if (this.enableDamping) {
                this.mSpherical.theta
                += this.mSphericalDelta.theta * this.dampingFactor;
                this.mSpherical.phi
                += this.mSphericalDelta.phi * this.dampingFactor;
            } else {
                this.mSpherical.theta += this.mSphericalDelta.theta;
                this.mSpherical.phi += this.mSphericalDelta.phi;
            }

            // restrict theta to be between desired limits
            this.mSpherical.theta = Math.max(
                this.minAzimuthAngle,
                Math.min(this.maxAzimuthAngle, this.mSpherical.theta));

            // restrict phi to be between desired limits
            this.mSpherical.phi = Math.max(
                this.minPolarAngle,
                Math.min(this.maxPolarAngle, this.mSpherical.phi));

            this.mSpherical.makeSafe();
            
            this.mSpherical.radius *= this.mScale;

            // restrict radius to be between desired limits
            this.mSpherical.radius = Math.max(
                this.minDistance,
                Math.min(this.maxDistance, this.mSpherical.radius));

            // move target to panned location

            if (this.enableDamping === true) {
                this.target.addScaledVector(
                    this.mPanOffset, this.dampingFactor);
            } else {
                this.target.add(this.mPanOffset);
            }

            offset.setFromSpherical(this.mSpherical);

            // rotate offset back to "camera-up-vector-is-up" space
            offset.applyQuaternion(quatInverse);
            position.copy(this.target).add(offset);
            this.object.lookAt(this.target);
            if (this.enableDamping === true) {
                this.mSphericalDelta.theta *= (1 - this.dampingFactor);
                this.mSphericalDelta.phi *= (1 - this.dampingFactor);
                this.mPanOffset.multiplyScalar(1 - this.dampingFactor);
            } else {
                this.mSphericalDelta.set(0, 0, 0);
                this.mPanOffset.set(0, 0, 0);
            }

            this.mScale = 1;

            // update condition is:
            // min(camera displacement, camera rotation in radians)^2 > EPS
            // using small-angle approximation cos(x/2) = 1 - x^2 / 8

            if (this.mZoomChanged
                || lastPosition.distanceToSquared(this.object.position) > EPS
                || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS) {

                lastPosition.copy(this.object.position);
                lastQuaternion.copy(this.object.quaternion);
                this.mZoomChanged = false;
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
            $el.off("contextmenu");
            $el.off("mousedown");
            $el.off("mousewheel");

            $el.off("touchstart");
            $el.off("touchend");
            $el.off("touchmove");

            $(document).off("mousemove");
            $(document).off("mouseup");

            $el.off("keydown");
        }

        _getAutoRotationAngle() {
            return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
        }

        _getZoomScale() {
            return Math.pow(0.95, this.zoomSpeed);
        }

        _rotateLeft(angle) {
            this.mSphericalDelta.theta -= angle;
        }

        _rotateUp(angle) {
            this.mSphericalDelta.phi -= angle;
        }

        _panLeft(distance, objectMatrix) {
            let v = new Three.Vector3();
            v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
            v.multiplyScalar(-distance);
            this.mPanOffset.add(v);
        }

        _panUp(distance, objectMatrix) {
            let v = new Three.Vector3();
            if (this.screenSpacePanning === true) {
                v.setFromMatrixColumn(objectMatrix, 1);
            } else {
                v.setFromMatrixColumn(objectMatrix, 0);
                v.crossVectors(this.object.up, v);
            }
            v.multiplyScalar(distance);
            this.mPanOffset.add(v);
        }

        // deltaX and deltaY are in pixels; right and down are positive
        _pan(deltaX, deltaY) {
            let offset = new Three.Vector3();
            let element = this.domElement;
            if (this.object.isPerspectiveCamera) {
                // perspective
                let position = this.object.position;
                offset.copy(position).sub(this.target);
                let targetDistance = offset.length();

                // half of the fov is center to top of screen
                targetDistance *= Math.tan((this.object.fov / 2)
                                           * Math.PI / 180.0);

                // we use only clientHeight here so aspect ratio does
                // not distort speed
                this._panLeft(
                    2 * deltaX * targetDistance / element.clientHeight,
                    this.object.matrix);
                this._panUp(
                    2 * deltaY * targetDistance / element.clientHeight,
                    this.object.matrix);

            } else if (this.object.isOrthographicCamera) {
                // orthographic
                this._panLeft(
                    deltaX * (this.object.right - this.object.left)
                    / this.object.zoom / element.clientWidth,
                    this.object.matrix);
                this._panUp(
                    deltaY * (this.object.top - this.object.bottom)
                    / this.object.zoom / element.clientHeight,
                    this.object.matrix);
            }
        }

        _dollyIn(dollyScale) {
            if (this.object.isPerspectiveCamera) {
                this.mScale /= dollyScale;
            } else if (this.object.isOrthographicCamera) {
                this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom * dollyScale));
                this.object.updateProjectionMatrix();
                this.mZoomChanged = true;
            }
        }

        _dollyOut(dollyScale) {
            if (this.object.isPerspectiveCamera) {
                this.mScale *= dollyScale;
            } else if (this.object.isOrthographicCamera) {
                this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / dollyScale));
                this.object.updateProjectionMatrix();
                this.mZoomChanged = true;
            }
        }

        //
        // event callbacks - update the object state
        //

        _mouseStartRotate(event) {
            this.mRotateStart.set(event.clientX, event.clientY);
            return STATE.ROTATE;
        }

        _mouseStartDolly(event) {
            this.mDollyStart.set(event.clientX, event.clientY);
            return STATE.DOLLY;
        }

        _mouseStartPan(event) {
            this.mPanStart.set(event.clientX, event.clientY);
            return STATE.PAN;
        }

        _mouseMoveRotate(event) {
            this.mRotateEnd.set(event.clientX, event.clientY);
            this.mRotateDelta
            .subVectors(this.mRotateEnd, this.mRotateStart)
            .multiplyScalar(this.rotateSpeed);

            let element = this.domElement;
            this._rotateLeft(
                2 * Math.PI * this.mRotateDelta.x
                / element.clientHeight); // yes, height
            this._rotateUp(
                2 * Math.PI * this.mRotateDelta.y
                / element.clientHeight);
            this.mRotateStart.copy(this.mRotateEnd);
            this.update();
        }

        _mouseMoveDolly(event) {
            this.mDollyEnd.set(event.clientX, event.clientY);
            this.mDollyDelta.subVectors(this.mDollyEnd, this.mDollyStart);
            if (this.mDollyDelta.y > 0) {
                this._dollyIn(this._getZoomScale());
            } else if (this.mDollyDelta.y < 0) {
                this._dollyOut(this._getZoomScale());
            }
            this.mDollyStart.copy(this.mDollyEnd);
            this.update();
        }

        _mouseMovePan(event) {
            this.mPanEnd.set(event.clientX, event.clientY);
            this.mPanDelta
            .subVectors(this.mPanEnd, this.mPanStart)
            .multiplyScalar(this.panSpeed);
            this._pan(this.mPanDelta.x, this.mPanDelta.y);
            this.mPanStart.copy(this.mPanEnd);
            this.update();
        }

        _handleMouseUp(event) {
            // no-op
            this.state = STATE.NONE;
        }

        _handleMouseWheel(event) {
            if (this.enabled && this.enableDollying
                && (this.state === STATE.NONE
                    || this.state === STATE.PAN
                    || this.state === STATE.ROTATE)) {
                event.preventDefault();
                event.stopPropagation();
                if (event.deltaY < 0)
                    this._dollyOut(this._getZoomScale());
                else if (event.deltaY > 0)
                    this._dollyIn(this._getZoomScale());
                this.update();
            }
        }

        _handleKeyDown(event) {
            switch (event.keyCode) {
            case this.keys.UP:
                this._pan(0, this.keyPanSpeed);
                break;
            case this.keys.BOTTOM:
                this._pan(0, -this.keyPanSpeed);
                break;
            case this.keys.LEFT:
                this._pan(this.keyPanSpeed, 0);
                break;
            case this.keys.RIGHT:
                this._pan(-this.keyPanSpeed, 0);
                break;
            default:
                return;
            }

            // prevent the browser from scrolling on cursor keys
            event.preventDefault();
            this.update();
        }

        _touchStartRotate(event) {
            if (event.touches.length == 1)
                this.mRotateStart.set(
                    event.touches[0].pageX,
                    event.touches[0].pageY);
            else {
                let x = 0.5 * (event.touches[0].pageX
                               + event.touches[1].pageX);
                let y = 0.5 * (event.touches[0].pageY
                               + event.touches[1].pageY);
                this.mRotateStart.set(x, y);
            }
            return STATE.TOUCH_ROTATE;
        }

        _touchStartPan(event) {
            if (event.touches.length == 1)
                this.mPanStart.set(
                    event.touches[0].pageX,
                    event.touches[0].pageY);
            else {
                let x = 0.5 * (event.touches[0].pageX
                               + event.touches[1].pageX);
                let y = 0.5 * (event.touches[0].pageY
                               + event.touches[1].pageY);
                this.mPanStart.set(x, y);
            }
            return STATE.TOUCH_PAN;
        }

        _touchStartDolly(event) {
            let dx = event.touches[0].pageX - event.touches[1].pageX;
            let dy = event.touches[0].pageY - event.touches[1].pageY;
            let distance = Math.sqrt(dx * dx + dy * dy);
            this.mDollyStart.set(0, distance);
        }

        _touchStartDollyPan(event) {
            if (this.enableDollying)
                this._touchStartDolly(event);
            if (this.enablePan)
                this._touchStartPan(event);
            return STATE.TOUCH_DOLLY_PAN;
        }

        _touchStartDollyRotate(event) {
            if (this.enableDollying)
                this._touchStartDolly(event);
            if (this.enableRotate)
                this._touchStartRotate(event);
            return STATE.TOUCH_DOLLY_ROTATE;
        }

        _touchMoveRotate(event) {
            if (event.touches.length == 1) {
                this.mRotateEnd.set(
                    event.touches[0].pageX,
                    event.touches[0].pageY);
            } else {
                let x = 0.5 * (event.touches[0].pageX
                               + event.touches[1].pageX);
                let y = 0.5 * (event.touches[0].pageY
                               + event.touches[1].pageY);
                this.mRotateEnd.set(x, y);
            }

            this.mRotateDelta
            .subVectors(this.mRotateEnd, this.mRotateStart)
            .multiplyScalar(this.rotateSpeed);
            let element = this.domElement;

            this._rotateLeft(2 * Math.PI * this.mRotateDelta.x
                             / element.clientHeight); // yes, height
            this._rotateUp(2 * Math.PI * this.mRotateDelta.y
                           / element.clientHeight);
            this.mRotateStart.copy(this.mRotateEnd);
        }

        _touchMovePan(event) {
            if (event.touches.length == 1) {
                this.mPanEnd.set(
                    event.touches[0].pageX, event.touches[0].pageY);
            } else {
                let x = 0.5 * (event.touches[0].pageX
                               + event.touches[1].pageX);
                let y = 0.5 * (event.touches[0].pageY
                               + event.touches[1].pageY);
                this.mPanEnd.set(x, y);
            }

            this.mPanDelta.subVectors(
                this.mPanEnd, this.mPanStart).multiplyScalar(this.panSpeed);
            this._pan(this.mPanDelta.x, this.mPanDelta.y);
            this.mPanStart.copy(this.mPanEnd);
        }

        _touchMoveDolly(event) {
            let dx = event.touches[0].pageX - event.touches[1].pageX;
            let dy = event.touches[0].pageY - event.touches[1].pageY;
            let distance = Math.sqrt(dx * dx + dy * dy);
            this.mDollyEnd.set(0, distance);
            this.mDollyDelta.set(
                0, Math.pow(
                    this.mDollyEnd.y / this.mDollyStart.y, this.zoomSpeed));
            this._dollyIn(this.mDollyDelta.y);
            this.mDollyStart.copy(this.mDollyEnd);
        }

        _touchMoveDollyPan(event) {
            if (this.enableDollying) this._touchMoveDolly(event);
            if (this.enablePan) this._touchMovePan(event);
        }

        _touchMoveDollyRotate(event) {
            if (this.enableDollying) this._touchMoveDolly(event);
            if (this.enableRotate) this._touchMoveRotate(event);
        }

        _handleTouchEnd(event) {
            // no-op
        }

        _handleMouseLeftDown(event) {
            if (this.mouseButtons.LEFT === Three.MOUSE.ROTATE) {
                if ((event.ctrlKey || event.metaKey || event.shiftKey)
                    && this.enablePan)
                    this.state = this._mouseStartPan(event);
                else if (this.enableRotate)
                    this.state = this._mouseStartRotate(event);
                else
                    this.state = STATE.NONE;
            } else if (this.mouseButtons.LEFT === Three.MOUSE.PAN) {
                if ((event.ctrlKey || event.metaKey || event.shiftKey)
                    && this.enableRotate) {
                    this.state = this._mouseStartRotate(event);
                } else if (this.enablePan)
                    this.state = this._mouseStartPan(event);
                else
                    this.state = STATE.NONE;
            }
        }

        _handleMouseMiddleDown(event) {
            if (this.mouseButtons.MIDDLE === Three.MOUSE.DOLLY
                && this.enableDollying)
                this.state = this._mouseStartDolly(event);
            else
                this.state = STATE.NONE;
        }

        _handleMouseRightDown(event) {
            if (this.mouseButtons.RIGHT === Three.MOUSE.ROTATE
                && this.enableRotate)
                this.state = this._mouseStartRotate(event);

            else if (this.mouseButtons.RIGHT === Three.MOUSE.PAN
                     && this.enablePan)
                this.state = this._mouseStartPan(event);
            
            else
                this.state = STATE.NONE;
        }

        _handle1Touch(event) {
            if (this.touches.ONE === Three.TOUCH.ROTATE && this.enableRotate)
                return this._touchStartRotate(event);

            if (this.touches.ONE === Three.TOUCH.PAN && this.enablePan)
                return this._touchStartPan(event);
            
            return STATE.NONE;
        }

        _handle2Touch(event) {
            if (this.touches.TWO === Three.TOUCH.DOLLY_PAN
                && (this.enableDollying || this.enablePan))
                return this._touchStartDollyPan(event);
            
            if (this.touches.TWO === Three.TOUCH.DOLLY_ROTATE
                && (this.enableDollying || this.enableRotate))
                return this._touchStartDollyRotate(event);
            
            
            return STATE.NONE;
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
                if (self.domElement.focus)
                    self.domElement.focus();
                else
                    window.focus();
                
                if (event.button === 0)
                    self._handleMouseLeftDown(event);
                else if (event.button === 1)
                    self._handleMouseMiddleDown(event);
                else if (event.button === 2)
                    self._handleMouseRightDown(event);
            });

            $el.on("mousemove", (event) => {
                if (self.enabled === false) return;
                
                event.preventDefault();
                
                if (self.mState === STATE.ROTATE && self.enableRotate)
                    self._mouseMoveRotate(event);
                else if (self.mState === STATE.DOLLY && self.enableDollying)
                    self._mouseMoveDolly(event);
                else if (self.mState === STATE.PAN && self.enablePan)
                    self._mouseMovePan(event);
            });

            $el.on("mouseup", (event) => {
                if (self.enabled)
                    self._handleMouseUp(event);
            });

            $el.on("mousewheel", (event) => {
                self._handleMouseWheel(event);
            });

            $el.on("keydown", (event) => {
                if (self.enabled && self.enableKeys && self.enablePan)
                    self._handleKeyDown(event);
            });

            $el.on("touchstart", (event) => {
                if (!self.enabled) return;
                
                event.preventDefault();
                if (event.touches.length === 1)
                    self.mState = this._handle1Touch(event);
                else if (event.touches.length === 1)
                    self.mState = this._handle2Touch(event);
                else
                    self.mState = STATE.NONE;
            });

            $el.on("touchmove", (event) => {
                if (!self.enabled) return;
                event.preventDefault();
                event.stopPropagation();
                switch (self.mState) {
                case STATE.TOUCH_ROTATE:
                    if (self.enableRotate) {
                        self._touchMoveRotate(event);
                        self.update();
                    }
                    break;
                case STATE.TOUCH_PAN:
                    if (self.enablePan) {
                        self._touchMovePan(event);
                        self.update();
                    }
                    break;
                case STATE.TOUCH_DOLLY_PAN:
                    if (self.enableDollying || self.enablePan) {
                        self._touchMoveDollyPan(event);
                        self.update();
                    }
                    break;
                case STATE.TOUCH_DOLLY_ROTATE:
                    if (self.enableDollying || self.enableRotate) {
                        self._touchMoveDollyRotate(event);
                        self.update();
                    }
                    break;
                default:
                    self.mState = STATE.NONE;
                }
            });

            $el.on("touchend", (event) => {
                if (self.enabled) {
                    self._handleTouchEnd(event);
                    self.mState = STATE.NONE;
                }
            });

            $el.on("contextmenu", (event) => {
                if (self.enabled)
                    event.preventDefault();
            })

            // make sure element can receive keys.
            if (self.domElement.tabIndex === -1)
                self.domElement.tabIndex = 0;
        }
    }

    return OrbitControls;
});
