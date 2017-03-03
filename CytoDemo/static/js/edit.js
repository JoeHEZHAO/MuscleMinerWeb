/**
* @Author: Pingjun Chen <Pingjun>
* @Date:   2017-02-01T11:24:38-05:00
* @Email:  codingPingjun@gmail.com
* @Filename: muscledraw.js
* @Last modified by:   Pingjun
* @Last modified time: 2017-02-06T22:03:20-05:00
* @License: The MIT License (MIT)
* @Copyright: Lab BICI2. All Rights Reserved.
*/

//(function() {                 // force everything local.
var w, h,isDown = false, pIndex = -1, pts = [];
var debug = 1;                  // whether or not to print debug messages
var localhost='';               // relative path to localhost

var ImageInfo = {};          
var imageOrder = [];            
var currentImage = undefined;   // name of the current image
var prevImage = undefined;      // name of the last image
var selectedTool;	            // currently selected tool
var navEnabled = true;          
var magicV = 1000;	            
var	params;			            // URL parameters
var config = {}                 // App configuration object

var imagingHelper;
var contours;
var canvas;
var magicV = 1000;
var containerWidth=0;
var containerHeight=0;

/***3
Tool selection
*/

function toolSelection(event) {
	if( debug ) console.log("> toolSelection");

	//end drawing of polygons and make open form
	if( drawingPolygonFlag == true )
	// finishDrawingPolygon(true);

	var prevTool = selectedTool;
	selectedTool = $(this).attr("id");
	selectTool();

	switch(selectedTool) {
        case "edit":
            navEnabled = false;
            break;
		case "zoom":
		navEnabled = true;
		break;
	}
}

function selectTool() {
	if( debug ) console.log("> selectTool");
	$("img.button").removeClass("selected");
	$("img.button#" + selectedTool).addClass("selected");
	//$("svg").removeClass("selected");
	//$("svg#"+selectedTool).addClass("selected");
}

/***5
Initialisation
*/

function loadImage(name) {
	if( debug ) console.log("> loadImage(" + name + ")");
	// save previous image for some (later) cleanup
	prevImage = currentImage;

	// set current image to new image
	currentImage = name;

	// open the currentImage
	$.ajax({
		type: 'GET',
		url: ImageInfo[currentImage]["source"],
		async: false,
		success: function(obj){
			viewer.open(obj);// localhost/name.dzi
		}
	});

	//viewer.open(ImageInfo[currentImage]["source"]);
}

function loadNextImage() {
	if( debug ) console.log("> loadNextImage");
	var index = imageOrder.indexOf(currentImage);
	var nextIndex = (index + 1) % imageOrder.length;

	// update image slider
	update_slider_value(nextIndex);

	loadImage(imageOrder[nextIndex]);
}

function loadPreviousImage() {
	console.log("> loadPrevImage");
	var index = imageOrder.indexOf(currentImage);
	var previousIndex = ((index - 1 >= 0)? index - 1 : imageOrder.length - 1 );

	// update image slider
	update_slider_value(previousIndex);

	loadImage(imageOrder[previousIndex]);
}

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

function deparam() {
	var result={};
	result.source="/slides";
	return result;
}

function initSlider(min_val, max_val, step, default_value) {
	/*
	Initializes a slider to easily change between slices
	*/
	if( debug ) console.log("> initSlider promise");
	var slider = $("#slider");

	if( slider.length > 0 ) { // only if slider could be found
		slider.attr("min", min_val);
		slider.attr("max", max_val - 1);
		slider.attr("step", step);
		slider.val(default_value);

		slider.on("change", function() {
			slider_onchange(this.value);
		});

		// Input event can only be used when not using database, otherwise the annotations will be loaded several times
		// TODO fix the issue with the annotations for real
		if (config.useDatabase == false) {
			slider.on("input", function() {
				slider_onchange(this.value);
			});
		}
	}
}

function slider_onchange(newImageIndex) {
	/*
	Called when the slider value is changed to load a new slice
	*/
	if( debug ) console.log("> slider_onchange promise");
	var imageNumber = imageOrder[newImageIndex];
	loadImage(imageNumber);
}

function update_slider_value(newIndex) {
	/*
	Used to update the slider value if the slice was changed by another control
	*/
	if( debug ) console.log("> update_slider_value promise");
	var slider = $("#slider");
	if( slider.length > 0 ) { // only if slider could be found
		slider.val(newIndex);
	}
}

function find_slice_number(number_str) {
	/*
	Searches for the given slice-number.
	If the number could be found its index will be returned. Otherwise -1
	*/
	var number = parseInt(number_str); // number = NaN if cast to int failed!
	if( !isNaN(number) ) {
		for( i = 0; i < imageOrder.length; i++ )  {
			var slice_number = parseInt(imageOrder[i]);
			// Compare the int values because the string values might be different (e.g. "0001" != "1")
			if( number == slice_number ) {
				return i;
			}
		}
	}

	return -1;
}

function slice_name_onenter(event) {
	/*
	Eventhandler to open a specific slice by the enter key
	*/
	if( debug ) console.log("> slice_name_onenter promise");
	if( event.keyCode == 13 ) { // enter key
		var slice_number = $(this).val();
		var index = find_slice_number(slice_number);
		if( index > -1 ) { // if slice number exists
			update_slider_value(index);
			loadImage(imageOrder[index]);
		}
	}
	event.preventDefault(); // prevent the default action (scroll / move caret)
}

function loadConfiguration() {
	// load general microdraw configuration
	$.getJSON("/static/config/configuration.json", function(data) {
		config = data;

		drawingTools = ["select", "draw", "draw-polygon", "simplify", "addpoint",
		"delpoint", "addregion", "delregion", "splitregion", "rotate",
		"save", "copy", "paste", "delete"];
		if( config.drawingEnabled == false ) {
			// remove drawing tools from ui
			for( var i = 0; i < drawingTools.length; i++ ){
				$("#" + drawingTools[i]).remove();
			}

		}
		for( var i = 0; i < config.removeTools.length; i++ ) {
			$("#" + config.removeTools[i]).remove();
		}
		if( config.useDatabase == false ) {
			//$("#save").remove();
		}
	});
}

function initMicrodraw() {

	// selectedTool = "zoom";
	// selectTool();

	if( debug )
	console.log("Reading local json file");
	$.ajax({
		type: 'GET',
		url: params.source,
		dataType: "json",
		contentType: "application/json",
		success: function(obj){
            console.log(obj);
			initMicrodraw2(obj);
		}
	});
}

function initMicrodraw2(obj) {
	// set up the ImageInfo array and imageOrder array
	if(debug) console.log(obj);
	for( var i = 0; i < obj.tileSources.length; i++ ) {
		// name is either the index of the tileSource or a named specified in the json file
		var name = ((obj.names && obj.names[i]) ? String(obj.names[i]) : String(i));
		imageOrder.push(name);
		ImageInfo[name] = {"source": obj.tileSources[i], "Regions": [], "projectID": undefined};
	}

	var start_slice = 0;
	initSlider(0, obj.tileSources.length, 1, start_slice);
	currentImage = imageOrder[start_slice];

	params.tileSources = obj.tileSources;

    imagingHelper = viewer.activateImagingHelper({});

	// open the currentImage
	if( debug )
		console.log("current url:", ImageInfo[currentImage]["source"]);
	$.ajax({
		type: 'GET',
		url: ImageInfo[currentImage]["source"],
		async: false,
		success: function(obj){
			viewer.open(obj); // localhost/name.dzi
		}
	});

	// add the scalebar
	viewer.scalebar({
		type: OpenSeadragon.ScalebarType.MICROSCOPE,
		minWidth:'150px',
		pixelsPerMeter:obj.pixelsPerMeter,
		color:'black',
		fontColor:'black',
		backgroundColor:"rgba(255,255,255,0.5)",
		barThickness:4,
		location: OpenSeadragon.ScalebarLocation.TOP_RIGHT,
		xOffset:5,
		yOffset:5
	});

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

	if( debug ) console.log("< initMicrodraw2 resolve: success");
}

function toggleMenu () {
	if( $('#menuBar').css('display') == 'none' ) {
		$('#menuBar').css('display', 'block');
		$('#menuButton').css('display', 'none');
	}
	else {
		$('#menuBar').css('display', 'none');
		$('#menuButton').css('display', 'block');
	}
}

$(function() {
	$.when(
		loadConfiguration()
	).then(function(){
		if( config.useDatabase ) {
			$.when(
				microdrawDBIP(),
				MyLoginWidget.init()
			).then(function(){
				params = deparam();
			}).then(initMicrodraw);
		} else {
			params = deparam();
			initMicrodraw();
		}
	});
});

function fillPoints(contours)
{
	renderCurve();
	// to stop the counter
	myInterval = setInterval(function () {
		  $.LoadingOverlay("hide");
		  clearInterval(myInterval);
	}, 1000);
}

function renderCurve() {
// //Create a Paper.js Path to draw a line into it:
	var path;
	// // Give the stroke a color
	var point;
	var x,y;
	var ox,oy;
	var objects=new paper.Group();

	$.each(contours.contours, function(index, element) {
	//  if (index != 0){
	//      return;
	//  }
		path = new paper.Path();
		path.closed = true;
		var lightness = (Math.random() - 0.5) * 0.4 + 0.4;
		var hue = Math.random() * 360;
		path.fillColor = { hue: hue, saturation: 1, lightness: lightness };
		path.strokeColor = 'green';
		path.strokeWidth = 1;
		$.each(element.points,function(ipnts, pnt){
			x = imagingHelper.dataToPhysicalX(pnt.x);
			y = imagingHelper.dataToPhysicalY(pnt.y);
			//    console.log(x,y);
			point = paper.view.viewToProject(new paper.Point(x,y));
			path.add(point);
		});
	});
	console.log('done with the segmentation thing');
}

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
  HIT TEST AND ITS RESULTING EFFECTS
  */
  var hitOptions = {
    points: true,
    stroke: true,
    fill: true,
    tolerance: 2
  };

paper.install(window);          // sets Paper objects and classes of 'window' to the global scope
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
