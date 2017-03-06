// (function(){

var viewer;

$( document ).ready(function() {
          var imageOrder = []; 
          var ImageInfo = {}; 

          function initMicrodraw() {

            viewer = new OpenSeadragon.Viewer({
              id: "openseadragon1",
              prefixUrl: "{{ url_for('static', filename='images/') }}",
              tileSources: [],
              showReferenceStrip: false,
              referenceStripSizeRatio: 0.2,
              showNavigator: true,
              sequenceMode: false,
              // navigatorId:"myNavigator",
              zoomInButton:"zoom-in",
              zoomOutButton:"zoom-out",
              homeButton:"home",
              preserveViewport: true
            });

            $.ajax({
                type: 'GET',
                url: '/slides',
                dataType: "json",
                contentType: "application/json",
                success: function(obj){
                        console.log(obj);
                  initMicrodraw2(obj);
                }
            });
          }

          function initMicrodraw2(obj) {
            for( var i = 0; i < obj.tileSources.length; i++ ) {
              // name is either the index of the tileSource or a named specified in the json file
              var name = ((obj.names && obj.names[i]) ? String(obj.names[i]) : String(i));
              imageOrder.push(name);
              ImageInfo[name] = {"source": obj.tileSources[i], "Regions": [], "projectID": undefined};
            }

            // params.tileSources = obj.tileSources;
            var start_slice = 0;
            var currentImage = imageOrder[start_slice];
            imagingHelper = viewer.activateImagingHelper({});

            // open the currentImage  
            $.ajax({
                type: 'GET',
                url: ImageInfo[currentImage]["source"],
                async: false,
                success: function(obj){
                  viewer.open(obj); // localhost/name.dzi
                }
            });
          }
          initMicrodraw();

  // paper.js is global here
  paper.install(window);
  var w, h,isDown = false, pIndex = -1,
  pts = [];
  //var canvas;
  var contours;
  var debug = false;
  var magicV = 1000;
  var contourPaths=[]; // variable to store paths of the paper
  var canvasdiv;
  var containerWidth=0;
  var containerHeight=0;
  var canvas;
  function initAnnotationOverlay(data) {
    if( debug ) console.log("> initAnnotationOverlay");

    if(debug) console.log("new overlay size" + viewer.world.getItemAt(0).getContentSize());

    // create a canvas overlay to draw everything
    // create canvas
    canvasdiv = document.createElement( 'div');
    canvasdiv.style.position = 'absolute';
    canvasdiv.style.left = 0;
    canvasdiv.style.top = 0;
    viewer.canvas.appendChild(canvasdiv);

    //Initializing canvas
    canvas = document.createElement('canvas');
    canvas.setAttribute('class', 'overlay');
    canvas.setAttribute('id', 'canvas-overlay');
    canvasdiv.appendChild(canvas);

    // create project
    paper.setup('canvas-overlay');
    if( debug ) console.log('Initializing the canvas overlay. All good till initialization.');

    resizeAnnotationOverlay();
    paper.settings.handleSize = 30;

    // Draw the view now:
    paper.view.draw();
    //
    // /* RT: commenting this line out solves the image size issues */
    // // set size of the current overlay to match the size of the current image
    // //magicV = viewer.world.getItemAt(0).getContentSize().x / 100;
    transform();
  }

  function resizeAnnotationOverlay() {
    if( debug ) console.log("> resizeAnnotationOverlay");
    var changed=false;
    var bounds = viewer.viewport.getBounds(true);
    //viewer.container.clientWidth
    if (containerWidth !== viewer.container.clientWidth) {
      containerWidth = viewer.container.clientWidth;
      $("canvas.overlay").width(containerWidth);
      changed=true;
    }
    if (containerHeight !== viewer.container.clientHeight) {
      containerHeight = viewer.container.clientHeight;
      $("canvas.overlay").height(containerHeight);
      changed=true;
    }
    if(changed)paper.view.viewSize = [containerWidth, containerHeight];

  }

  var z=1;

  function transform() {
    if( debug ) console.log("> transform");
    var p = imagingHelper.logicalToPhysicalPoint(new OpenSeadragon.Point(0, 0));
    z = viewer.viewport.viewportToImageZoom(viewer.viewport.getZoom(true));
    var sw = viewer.source.width;
    var bounds = viewer.viewport.getBounds(true);
    var x = magicV * bounds.x;
    var y = magicV * bounds.y;
    var w = magicV * bounds.width;
    var h = magicV * bounds.height;
    paper.view.setCenter(x + w / 2, y + h / 2);
    paper.view.zoom=(sw * z) / magicV;
  }  

var myInterval;
var counter=0;
var running;
  $(document).submit(function(e){
    var form = jQuery(e.target);
    if(form.is("#frmsegment")){ // check if this is the form that you want (delete this check to apply this to all forms)
      e.preventDefault();
      $.LoadingOverlay("show");

      jQuery.ajax({
        type: "POST",
        url: form.attr("action"),
        data: form.serialize(), // serializes the form's elements.
        success: function(data) {
          // use data.contours
          // render the curves here
          contours = data;
          fillPoints(contours);
        }
      });
    }
  });

  // Use this function to create the contour points returned as json data from python
  function fillPoints(contours)
  {
    renderCurve();
    // to stop the counter
    myInterval = setInterval(function () {
      $.LoadingOverlay("hide");
      clearInterval(myInterval);
    }, 1000);

  }

  // add handlers: update slice name, animation, page change, mouse actions
  viewer.addHandler('open',function(){
    initAnnotationOverlay();
  });

  viewer.addHandler('animation', function(event){
    transform();
  });

  viewer.addViewerInputHook({hooks: [
    {tracker: 'viewer', handler: 'clickHandler', hookHandler: clickHandler},
    {tracker: 'viewer', handler: 'dragHandler', hookHandler: dragHandler},
    {tracker: 'viewer', handler: 'dragEndHandler', hookHandler: dragEndHandler},
    {tracker: 'viewer', handler: 'dblClickHandler', hookHandler: dblClickHandler}
    //{tracker: 'viewer', handler: 'moveHandler', hookHandler: moveHandler}, //moveHandler
  ]});
  var imagingHelper = viewer.activateImagingHelper({});
  /***2
  Interaction: mouse and tap
  */
  function clickHandler(event){
    if( debug ) console.log("> pressHandler");
    event.stopHandlers = true;
    onMouseDown(event.originalEvent.layerX,event.originalEvent.layerY);
  }

  function moveHandler(event)
  {
    event.stopHandlers=true;
    onMouseMove(event.originalEvent.layerX,event.originalEvent.layerY);
  }

  function dragHandler(event){
    if( debug) console.log("> dragHandler");
    event.stopHandlers = true;
    onMouseDrag(event.originalEvent.layerX,event.originalEvent.layerY,event.delta.x,event.delta.y);
  }

  function dragEndHandler(event){
    if( debug ) console.log("> dragEndHandler");
    event.stopHandlers = true;
    onMouseUp();
  }

  function singlePressOnRegion(event) {
    if( debug ) console.log("> singlePressOnRegion");
    event.stopPropagation();
    event.preventDefault();
    // Not sure about this at the moment
  }

  function dblClickHandler(event){
    if (debug) console.log(">doubleClickHandler");
    event.stopHandlers=true;
    onDoubleClick(event.originalEvent.layerX,event.originalEvent.layerY);
  }

  function doublePressOnRegion(event) {
    if( debug ) console.log("> doublePressOnRegion");

    event.stopPropagation();
    event.preventDefault();

    // if found double pressed on region delete it
  }

  function getPos(e) {
    // The canvas-click event gives us a position in web coordinates.
    var webPoint = e.position;

    // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
    var viewportPoint = viewer.viewport.pointFromPixel(webPoint);

    var imageportPoint= viewer.viewport.viewportToImageCoordinates(viewportPoint);

    return {x: imageportPoint.x , y: imageportPoint.y}
  }

  /*
  *	Draw curve with current settings and points
  */
  var imgAspectRatio=1;
  var raster;
  function renderCurve() {
    // //Create a Paper.js Path to draw a line into it:
    var path;
    // // Give the stroke a color
    var point;
    var x,y;
    var ox,oy;
    var objects=new paper.Group();
    // console.log(contours);
    // Draw the view now:

    $.each(contours.contours, function(index, element) {
      path = new paper.Path();
      path.closed = true;
      var lightness = (Math.random() - 0.5) * 0.4 + 0.4;
      var hue = Math.random() * 360;
      path.fillColor = { hue: hue, saturation: 1, lightness: lightness };
      path.strokeColor = 'green';
      $.each(element.points,function(ipnts, pnt){
        x= imagingHelper.dataToPhysicalX(pnt.y);
        y= imagingHelper.dataToPhysicalY(pnt.x);
        point = paper.view.viewToProject(new paper.Point(x,y));
        path.add(point);
      });
    });
    console.log('done with the segmentation thing');
  }

  /*
  HIT TEST AND ITS RESULTING EFFECTS
  */
  var hitOptions = {
    points: true,
    stroke: true,
    fill: true,
    tolerance: 2
  };

  var segmentArray = [];
  var segment, path;
  var movePath = false;
  var dragging = false;
  var editMode = false;
  var handle;
  var dragMode = false;
  var addMode=false;
  var addPoints=null;
  var hitResultId= null;
  var path1 = new paper.Path();
  var path2 = new paper.Path();
  var path3 = new paper.Path();
  var segmentStartIndex = null;
  var segmentsEndIndex = null;
  var selectedRect=null;
  var segmentLonger;
  var segmentShorter;
  var hitResult;
  var pathArc;
  var mouseUpCurve;
  var path_temp;
  var dragDone = false;
  function onMouseDown(x,y) {
    // x,y means where your mouse hit on the screen
    if (dragMode) {
      if (pathArc != null) {
            pathArc.removeSegments();
            pathArc = null;
      }if (path_temp != null) {
            path_temp.removeSegments();
            path_temp = null;
      }
      startOver(); // when drag, start everything from here
      return;
    }

    if(addMode){
      pts.push(x,y);
      if(pts.length>=8){
        if(circle!=null){
        //draw the curve and remove the circle
          circle.remove();
          circle=null;
        }
        addMode=false;
        path = new paper.Path();
        path.closed = true;
        var lightness = (Math.random() - 0.5) * 0.4 + 0.4;
        var hue = Math.random() * 360;
        path.fillColor = { hue: hue, saturation: 1, lightness: lightness };
        path.strokeColor = 'green';
        for(var i=0; i < pts.length; i += 2) {
            point = paper.view.viewToProject(new paper.Point(pts[i],pts[i+1]));
            path.add(point);
        }
        path.smooth();
        path.flatten(0.001);
        pts=[];
      }
    }else{
      var pnt=paper.view.viewToProject(new paper.Point(x,y));
      hitResult = project.hitTest(pnt, hitOptions);

      // check whether or not to continue
      if (hitResult == null) {
        startOver();
        return; //break if click on outside
      }else if (hitResultId == null) {
          hitResultId = hitResult.item.id;
      }else if(hitResultId != hitResult.item.id){
        startOver();
        return; //break if click on differnt contour
     }
      //end

      // find closest point in contour
      var minlDistance = 2000
      var bestPoint = {
        x: 0,
        y: 0
      }
      var index;
      for( i = 0; i < hitResult.item.segments.length; i++){
        if( Math.abs(hitResult.item.segments[i].point.x - pnt.x) +
            Math.abs(hitResult.item.segments[i].point.y - pnt.y) <
            minlDistance
          )
        {
          minlDistance = Math.abs(hitResult.item.segments[i].point.x - pnt.x) +
                         Math.abs(hitResult.item.segments[i].point.y - pnt.y);
          bestPoint.x = hitResult.item.segments[i].point.x;
          bestPoint.y = hitResult.item.segments[i].point.y;
          index = i;
        };
      };
      //end

      // find segment index
      if(segmentStartIndex == null){
         segmentStartIndex = index;
      }
      else if (segmentsEndIndex == null) {
         segmentsEndIndex = index;
      }

      // draw two rectangulars on the closest point, control three-times-most click event
      if(path1  == null){
        var size = new Size(5, 5);
        var point = new Point(bestPoint.x - 2.5, bestPoint.y - 2.5);
        path1 = new Path.Rectangle(point, size);
        path1.fillColor = 'blue';
        // path1.strokeColor = 'green';
      }else if (path2 == null) {
        var size = new Size(5, 5);
        var point = new Point(bestPoint.x - 2.5, bestPoint.y - 2.5);
        path2 = new Path.Rectangle(point, size);
        path2.fillColor = 'blue'
        // path2.strokeColor = 'red';
      }
      //end

      // after two clicks, find middle point and mark it out, seperate into two parts
      var midPointIndex;
      if (segmentStartIndex != null && segmentsEndIndex != null) {
        var segPath1 = new paper.Path();
        segPath1.strokeColor = 'green';
        segPath1.smooth({ type: 'continuous' });
        var segPath2 = new paper.Path();
        segPath2.strokeColor = 'green';
        segPath2.smooth({ type: 'continuous' });
        getMiddlePoint(segmentStartIndex, segmentsEndIndex, segPath1, segPath2);
        if (segPath1.length > segPath2.length) {
             for (var i = 0; i < segPath1.segments.length; i++)
             {
               var point = new Point(segPath1.segments[i].point.x,segPath1.segments[i].point.y);
               segmentArray.push(point);
             }
             midPointIndex = Math.round(segPath2.segments.length/2);
             var size = new Size(5, 5);
             var midPoint = new Point(segPath2.segments[midPointIndex].point.x - 2.5,
                                      segPath2.segments[midPointIndex].point.y - 2.5);
             path3 = new Path.Rectangle(midPoint, size);
            //  path3.strokeColor = 'purple';
             path3.fillColor = 'red';
             dragMode = true;
             pathArc = segPath2;
             path_temp = segPath1;
        }else {
              for (var i = 0; i < segPath2.segments.length; i++)
              {
                var point = new Point(segPath2.segments[i].point.x, segPath2.segments[i].point.y);
                segmentArray.push(point);
              }
              midPointIndex = Math.round(segPath1.segments.length/2);
              var size = new Size(5, 5);
              var midPoint = new Point(segPath1.segments[midPointIndex].point.x - 2.5,
                                       segPath1.segments[midPointIndex].point.y - 2.5);
              path3 = new Path.Rectangle(midPoint, size);
              // path3.strokeColor = 'purple';
              path3.fillColor = 'red';
              dragMode = true;
              pathArc = segPath1;
              path_temp = segPath2;
        }
      }
    }
  }

  function startOver(){
    if (path1 != null) {
      path1.removeSegments();
      path1 = null;
    }
    if (path2 != null) {
      path2.removeSegments();
      path2 = null;
    }
    if (path3 != null) {
      path3.removeSegments();
      path3 = null;
    }
    hitResultId = null;
    segmentStartIndex = null;
    segmentsEndIndex = null;
    segmentArray = [];
    dragMode = false;
    dragDone = false;
  }

  function getMiddlePoint(segmentStartIndex, segmentsEndIndex, segPath1, segPath2){
    if (segmentStartIndex < segmentsEndIndex) {
        var countStart = segmentStartIndex;
        var countEnd = segmentsEndIndex;
        while(countStart <= countEnd){
          segPath1.add(hitResult.item.segments[countStart].point.x,
                       hitResult.item.segments[countStart].point.y);
          countStart++;
        }
        segPath1.add(hitResult.item.segments[countEnd].point.x,
                     hitResult.item.segments[countEnd].point.y);
        countStart = segmentsEndIndex;
        countEnd = segmentStartIndex;
        while (countStart != countEnd) {
          segPath2.add(hitResult.item.segments[countStart].point.x,
                       hitResult.item.segments[countStart].point.y);
          countStart++;
          if (countStart >= hitResult.item.segments.length) {
                countStart = 0;
          }
        }
    }else {
        var countStart = segmentsEndIndex;
        var countEnd = segmentStartIndex;
        while(countStart <= countEnd){
          segPath1.add(hitResult.item.segments[countStart].point.x,
                       hitResult.item.segments[countStart].point.y);
          countStart++;
        }
        segPath1.add(hitResult.item.segments[countEnd].point.x,
                     hitResult.item.segments[countEnd].point.y);

        countStart = segmentStartIndex;
        countEnd = segmentsEndIndex;
        while (countStart != countEnd) {
          segPath2.add(hitResult.item.segments[countStart].point.x,
                       hitResult.item.segments[countStart].point.y);
          countStart++;
          if (countStart >= hitResult.item.segments.length) {
                countStart = 0;
          }
        }
    }
  }

  function onMouseUp()
  {
    if (dragDone == true) {
      // find a way to add every thing on the contour
      // console.log(segmentArray);

      var long = segmentArray.length;
      pathArc.flatten(0.001);
      // pathArc.flatten();
      // alert(pathArc.segments.length);
      if (
          Math.abs(segmentArray[long - 1].x - pathArc.segments[pathArc.segments.length - 1].point.x) +
          Math.abs(segmentArray[long - 1].y - pathArc.segments[pathArc.segments.length - 1].point.y) >
          Math.abs(segmentArray[long - 1].x - pathArc.segments[0].point.x) +
          Math.abs(segmentArray[long - 1].y - pathArc.segments[0].point.y)
      )
      {
        for (var i = 0; i < pathArc.segments.length; i++) {
          segmentArray.push(new Point(pathArc.segments[i].point.x, pathArc.segments[i].point.y));
        }
      }else {
        for (var i = 0; i < pathArc.segments.length; i++) {
          segmentArray.push(new Point(pathArc.segments[pathArc.segments.length - 1 - i].point.x, pathArc.segments[pathArc.segments.length - 1 - i].point.y));
        }
      }
      pathArc.removeSegments();
      path_temp.removeSegments();
      pathArc = null;
      path_temp = null;
      var newLine = new Path({
          segments: segmentArray,
          strokeColor : 'green'
      });
      newLine.smooth({ type: 'continuous' });
      newLine.closed = true;
      newLine.fillColor = 'purple';
      console.log("twice click stll draw things here"); // it works only after drag
    }else {
      // twice click should not draw anything on graph
    }
    segmentArray = [];
    if( debug ) console.log("> mouseUp");
    if(path!=null) path.fullySelected = false;
    if(editMode) editMode = false;
  }

  function onMouseDrag(x,y,dx,dy) {
      if(path3)
      {
          hitResult.item.removeSegments();
          var dpoint = paper.view.viewToProject(new paper.Point(x,y));
          originX = dpoint.x;
          originY = dpoint.y;
          var point = new Point(originX -2.5, originY - 2.5);
          var size = new Size(5,5);
          // dynamic change path3 Rectangle
          path3.removeSegments();
          path3 = new paper.Path.Rectangle(point,size);
          path3.strokeColor = 'purple';
          path3.fillColor = 'purple';
          var point1 = new Point(path1.segments[0].point.x, path1.segments[0].point.y);
          var point2 = new Point(path2.segments[0].point.x, path2.segments[0].point.y);
          // dynamic draw shorter segment after drag
          pathArc.removeSegments();
          pathArc = new paper.Path();
          pathArc.strokeColor = 'green';
          pathArc.add(new Point(point1.x + 2.5, point1.y -2.5));
          pathArc.add(new Point(point.x, point.y));
          pathArc.add(new Point(point2.x + 2.5, point2.y - 2.5));
          pathArc.smooth({ type: 'continuous' });
          pathArc.closed = false;
          dragDone = true;
      }else {
          startOver();
      }
  }

  var circle=null;
  function onDoubleClick(x,y)
  {
    path=null;
    var pnt=paper.view.viewToProject(new paper.Point(x,y));
    var hitResult = project.hitTest(pnt, hitOptions);

    if (hitResult) {
      if(debug)console.log("Item Selected:"+hitResult.type);
      path = hitResult.item;
      path.remove();
    }else{
      radius=5;
      circle = new Path.Circle(pnt, radius);
      circle.strokeColor = 'green';
      addMode=true;
    }
  }
});
// })();
