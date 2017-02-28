(function(){

  var ctx;
  var w, h,isDown = false, pIndex = -1,
  pts = [];
  var canvas;
  var contours;
  var flg_updated=false;
  var flg_segmented=false;
  var flg_double_click = false;

  $(document).submit(function(e){
    var form = jQuery(e.target);
    if(form.is("#frmsegment")){ // check if this is the form that you want (delete this check to apply this to all forms)
      e.preventDefault();
      $("#divLoading").show(500);
      jQuery.ajax({
        type: "POST",
        url: form.attr("action"),
        data: form.serialize(), // serializes the form's elements.
        success: function(data) {
          // use data.contours
          // render the curves here
          contours = data;
          fillPoints(contours);
          flg_updated=true;
          flg_segmented=true;
        }
      });
    }
  });



  // Use this function to create the contour points returned as json data from python
  function fillPoints(contours)
  {
    if(canvas==undefined)
    {
      canvas= viewer.canvasOverlay({
        onRedraw:function() {
          if(!ctx||ctx==undefined){
            ctx=canvas.context2d();
          }

          renderCurve();
        },
        clearBeforeRedraw:true
      });

      $(window).resize(function() {
        canvas.resize();
      });
    }

    canvas.resize();
    canvas.updateCanvas(true);
    $("#divLoading").hide(500);
  }

  /*
  *	Collect options
  */
  function CurveOptions() {
    this.closed = true;
    this.fill = false;
    this.points = true;
    this.segments = 1;
    this.tension = 5 * 0.1;
  }

  viewer.addHandler("canvas-double-click", function(e){

    // else find the clicked point and delete it
    var pos = getPos(e);
    var tmp_canvas =  document.createElement('canvas');
    var tmp_ctx = tmp_canvas.getContext('2d');
    var tmp_flg_deleted =false;
    $.each(contours.contours, function(index, element) {
      tmp_ctx.beginPath();
      $.each(element.points,function(ipnts, pnt){
          tmp_ctx.lineTo(parseInt(pnt.y), parseInt(pnt.x));
      });

      if(tmp_ctx.isPointInPath(pos.x,pos.y))
      {
        contours.contours[index]=[];
        tmp_flg_deleted=true;
        // remove the contours and rerender
        return;
      }

    });

    if(tmp_flg_deleted){
      renderCurve();
      canvas.resize();
      canvas.updateCanvas(true);
      tmp_flg_deleted=false;
    }

    flg_double_click = false;
  });

  var clicks=0;
  viewer.addHandler('canvas-click', function(e){
    /*
    * BACKUP CODE FOR CURVE
    *
    //viewer.gestureSettingsMouse.clickToZoom = false;

    //  if(pts.length<14){
    //    pts.push(pos.x,pos.y);
    //    console.log(pos.x+' '+pos.y);
    //    if(pts.length<14)
    //       return;
    //  }
    */

    var pos = getPos(e),
    i = 0,
    m = 5;

    pIndex = -1;
    isDown = false;
    for(; i < pts.length; i += 2) {
      console.log('new clicked point'+' '+pos.x+' '+pos.y);
      if (pos.x >= pts[i] - m && pos.x < pts[i] + m &&
        pos.y >= pts[i+1] - m && pos.y < pts[i+1] + m) {
          isDown = true;
          pIndex = i;
        }
      }
    });

    viewer.addHandler('canvas-drag-end', function(e){
      isDown = false;
    });

    viewer.addHandler('canvas-drag', function(e){
      if (isDown) {
        viewer.panHorizontal = false;
        viewer.panVertical = false;
        var pos = getPos(e);
        pts[pIndex] = pos.x;
        pts[pIndex+1] = pos.y;
        renderCurve();
      }else{
        viewer.panHorizontal = true;
        viewer.panVertical = true;
      }
    });


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
    function renderCurve() {

      //if(!flg_updated) return;

      // get current options
      var o = new CurveOptions();
      ctx.beginPath();
      $.each(contours.contours, function(index, element) {
        pts=[];
        $.each(element.points,function(ipnts, pnt){
          pts.push(parseInt(pnt.y),parseInt(pnt.x));
        });

        ctx.moveTo(pts[0], pts[1]);
        ctx.curve(pts, o.tension, o.segments, o.closed);
        ctx.closePath();

        //return false;
      });
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 10;
      ctx.stroke();
      flg_updated=false;

      // draw our cardinal spline

      // show original points
      // 	if (o.points) {
      // 		var l = pts.length - 2;
      // 		ctx.lineWidth = 2;
      // 		ctx.strokeStyle = '#0f0';
      // 		ctx.strokeRect(pts[0] - 10, pts[1] - 10, 10, 10);
      // 		ctx.strokeStyle = 'rgba(255,0,0,0.7)';
      // 		ctx.strokeRect(pts[l] - 10, pts[l+1] - 10, 10, 10);
      // 		ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      // 		ctx.beginPath();
      // 		for(var i = 2; i < l; i += 2) {
      //     ctx.rect(pts[i] - 10, pts[i+1] - 10, 10, 10);
      //   }
      // 		ctx.stroke();
      //   ctx.fillStyle='green';
      //   ctx.fill();
      // 	}
    }


  })();
