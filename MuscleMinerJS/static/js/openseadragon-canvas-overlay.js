// OpenSeadragon canvas Overlay plugin 0.0.1 based on svg overlay plugin

(function() {

    if (!window.OpenSeadragon) {
        console.error('[openseadragon-canvas-overlay] requires OpenSeadragon');
        return;
    }


    // ----------
    OpenSeadragon.Viewer.prototype.canvasOverlay = function(options) {

        if (this._canvasOverlayInfo) {
            return this._canvasOverlayInfo;
        }

        this._canvasOverlayInfo = new Overlay(this,options);
        return this._canvasOverlayInfo;
    };

    // ----------
    var Overlay = function(viewer,options) {
        var self = this;
        console.log(this);
        this._viewer = viewer;

        this._containerWidth = 0;
        this._containerHeight = 0;

        this._canvasdiv = document.createElement( 'div');
        this._canvasdiv.style.position = 'absolute';
        this._canvasdiv.style.left = 0;
        this._canvasdiv.style.top = 0;
        this._canvasdiv.style.width = '100%';
        this._canvasdiv.style.height = '100%';
        this._viewer.canvas.appendChild(this._canvasdiv);

        this._canvas = document.createElement('canvas');
        this._canvas.setAttribute('id', 'osd-overlaycanvas');
        //this._canvas.setAttribute('style', 'background-color:blue;');
        this._canvasdiv.appendChild(this._canvas);

        this.onRedraw = options.onRedraw || function(){};
        this.clearBeforeRedraw = (typeof (options.clearBeforeRedraw) !== "undefined") ?
                        options.clearBeforeRedraw : true;

        $(this._canvas).mousedown(function(event) {
            //event.preventDefault();
            //event.stopPropagation();
        });

        $(this._canvas).mouseup(function(event) {
            //event.preventDefault();
            //event.stopPropagation();
        });

        $(this._canvas).mousemove(function(event) {
            //event.preventDefault();
            //event.stopPropagation();
        });
        // prevent OSD click elements on fabric objects
        // this._canvas.on('mouse:down', function (options) {
        //     if (options.target) {
        //         options.e.preventDefault();
        //         options.e.stopPropagation();
        //     }
        // });

        this._viewer.addHandler('update-viewport', function() {
            self.resize();
            self.updateCanvas();
        });

        this._viewer.addHandler('open', function() {
            self.resize();
            self.updateCanvas();
        });

        this.resize();

    };

    // ----------
    Overlay.prototype = {
        // ----------
        canvas: function() {
            return this._canvas;
        },
        // ----------
        context2d: function() {
            return this._canvas.getContext('2d');
        },
        // ----------
        clear: function() {
            this._canvas.getContext('2d').clearRect(0, 0, this._containerWidth, this._containerHeight);
        },
        // ----------
        resize: function() {
            if (this._containerWidth !== this._viewer.container.clientWidth) {
                this._containerWidth = this._viewer.container.clientWidth;
                this._canvasdiv.setAttribute('width', this._containerWidth);
                this._canvas.setAttribute('width', this._containerWidth);
            }

            if (this._containerHeight !== this._viewer.container.clientHeight) {
                this._containerHeight = this._viewer.container.clientHeight;
                this._canvasdiv.setAttribute('height', this._containerHeight);
                this._canvas.setAttribute('height', this._containerHeight);
            }
            this._viewportOrigin = new OpenSeadragon.Point(0, 0);
            var boundsRect = this._viewer.viewport.getBounds(true);
            this._viewportOrigin.x = boundsRect.x;
            this._viewportOrigin.y = boundsRect.y * this.imgAspectRatio;

            this._viewportWidth = boundsRect.width;
            this._viewportHeight = boundsRect.height * this.imgAspectRatio;
            this.imgWidth = this._viewer.viewport.contentSize.x;
            this.imgHeight = this._viewer.viewport.contentSize.y;
            this.imgAspectRatio = this.imgWidth / this.imgHeight;
        },
        updateCanvas: function() {
            var viewportZoom = this._viewer.viewport.getZoom(true);
            var image1 = this._viewer.world.getItemAt(0);
            var zoom = image1.viewportToImageZoom(viewportZoom);

            var x=((this._viewportOrigin.x/this.imgWidth-this._viewportOrigin.x )/this._viewportWidth)*this._containerWidth;
            var y=((this._viewportOrigin.y/this.imgHeight-this._viewportOrigin.y )/this._viewportHeight)*this._containerHeight;

            if (this.clearBeforeRedraw) this.clear();
            this._canvas.getContext('2d').translate(x,y);
            this._canvas.getContext('2d').scale(zoom,zoom);
            this.onRedraw();
            this._canvas.getContext('2d').setTransform(1, 0, 0, 1, 0, 0);
        }
    };

})();
