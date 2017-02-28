(function () {
    function curvePoint() {
        this.x = 0;
        this.y = 0;
        this.computeDistance = function (pt) {
            var xd = pt.x - this.x,
                yd = pt.y - this.y;
            return Math.sqrt(xd * xd + yd * yd);
        };
    }

    function curve() {
        this.isValid = false;

        this.p1 = new curvePoint();
        this.p2 = new curvePoint();
        this.cp1 = new curvePoint();
        this.cp2 = new curvePoint();

        this.set = function (params) {
            params = params.replace(/[^0-9,]/g, '');
            params = params.replace(/,,/g, '');
            var split = params.split(",");
            this.p1.x = 1 * split[0];
            this.p1.y = 1 * split[1];
            this.cp1.x = 1 * split[2];
            this.cp1.y = 1 * split[3];
            this.cp2.x = 1 * split[4];
            this.cp2.y = 1 * split[5];
            this.p2.x = 1 * split[6];
            this.p2.y = 1 * split[7];

            this.isValid = (split.length >= 8);
        };
    }

    var current = 0;
    var curves = [];

    var selectionRadius;
    var deleteMode = false;
    var canvas, ctx, code, style, drag = null,
        dPoint;

    var animating = false;
    var currentAnimCurve = 0;

    var animationSpeed = 1000;
    var animStart = 0;
    var date = new Date();

    function animate() {
        currentAnimCurve = 0;
        animating = !animating;
        animStart = date.getTime();
    }

    function addCurve() {
        var curveParams = prompt("Enter curve params", "100,250,150,100,350,100,400,250");
        var tCurve = new curve();
        tCurve.set(curveParams);


        if (tCurve.isValid) curves.push(tCurve);
        DrawCanvas();
    }

    function delCurve() {
        deleteMode = !deleteMode;
        DrawCanvas();
    }


    // define initial points
    function Init() {
        // default styles
        style = {
            curve: {
                width: 10,
                color: "#00F"
            },
            cpline: {
                width: 1,
                color: "#C00"
            },
            startpoint: {
                radius: 5,
                width: 2,
                color: "#090",
                fill: "rgba(200,200,200,0.5)",
                arc1: 0,
                arc2: 2 * Math.PI
            },
            endpoint: {
                radius: 5,
                width: 2,
                color: "#900",
                fill: "rgba(200,200,200,0.5)",
                arc1: 0,
                arc2: 2 * Math.PI
            },
            point: {
                radius: 5,
                width: 2,
                color: "#900",
                fill: "rgba(200,200,200,0.5)",
                arc1: 0,
                arc2: 2 * Math.PI
            },
            cppoint: {
                radius: 5,
                width: 1,
                color: "#000",
                fill: "rgba(200,200,200,0.5)",
                arc1: 0,
                arc2: 2 * Math.PI
            }
        };
        selectionRadius = style.point.radius * 1.5;
        // line style defaults
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // event handlers
        canvas.onmousedown = DragStart;
        canvas.onmousemove = Dragging;
        canvas.onmouseup = canvas.onmouseout = DragEnd;
        DrawCanvas();
    }

    function lerp(start, end, amount)
    {
        return (start + amount * (end - start));
    }

    function LerpCurve(bezier1, bezier2, time)
    {
        var tCurve = new curve();
        tCurve.p1.x = lerp(bezier1.p1.x,bezier2.p1.x, time);
        tCurve.p1.y = lerp(bezier1.p1.y,bezier2.p1.y, time);

        tCurve.cp1.x = lerp(bezier1.cp1.x,bezier2.cp1.x, time);
        tCurve.cp1.y = lerp(bezier1.cp1.y,bezier2.cp1.y, time);

        tCurve.cp2.x = lerp(bezier1.cp2.x,bezier2.cp2.x, time);
        tCurve.cp2.y = lerp(bezier1.cp2.y,bezier2.cp2.y, time);

        tCurve.p2.x = lerp(bezier1.p2.x,bezier2.p2.x, time);
        tCurve.p2.y = lerp(bezier1.p2.y,bezier2.p2.y, time);
        tCurve.isValid = true;
        return tCurve;
    }

    function DrawCurve(point)
    {
        if (!deleteMode) {
                    // control lines
                    ctx.lineWidth = style.cpline.width;
                    ctx.strokeStyle = style.cpline.color;
                    ctx.beginPath();
                    ctx.moveTo(point.p1.x, point.p1.y);
                    ctx.lineTo(point.cp1.x, point.cp1.y);
                    ctx.moveTo(point.p2.x, point.p2.y);
                    ctx.lineTo(point.cp2.x, point.cp2.y);
                    ctx.stroke();
                }

                // curve
                ctx.lineWidth = style.curve.width;
                ctx.strokeStyle = style.curve.color;
                ctx.beginPath();
                ctx.moveTo(point.p1.x, point.p1.y);
                ctx.bezierCurveTo(point.cp1.x, point.cp1.y, point.cp2.x, point.cp2.y, point.p2.x, point.p2.y);
                ctx.stroke();

                // control points
                for (var p in point) {
                    if (p == "cp1" || p == "cp2") {
                        ctx.lineWidth = style.cppoint.width;
                        ctx.strokeStyle = style.cppoint.color;
                        ctx.fillStyle = style.cppoint.fill;
                    } else {
                        if (p == "p1") ctx.strokeStyle = style.startpoint.color;
                        else ctx.strokeStyle = style.endpoint.color;
                        ctx.lineWidth = style.point.width;
                        ctx.fillStyle = style.point.fill;
                    }
                    if (!deleteMode || !(p == "cp1" || p == "cp2")) {
                        ctx.beginPath();
                        ctx.arc(point[p].x, point[p].y, style.point.radius, style.point.arc1, style.point.arc2, true);
                        ctx.fill();
                        ctx.stroke();
                    }
                }
    }

    // draw canvas
    function DrawCanvas() {

        style.curve.width = document.getElementById("strokeWidth").value;
        if(animating){
            ctx.fillStyle = "#D9F2A7";
        }
        else if (deleteMode) {
            ctx.fillStyle = "#F5B8C2";
        } else {
            ctx.fillStyle = "#FFFFFF";
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (img && img.src !== "") {
            ctx.drawImage(img, 0, 0);
        }

        if (!animating) {
            for (i = 0; i < curves.length; i++) {
                DrawCurve(curves[i]);
            }
        }
        else if(curves.length>1)
        {
            var elapsedTime = new Date().getTime()-animStart;
            if(elapsedTime>((curves.length)*animationSpeed))
            {
                animStart = new Date().getTime();
                elapsedTime = 0;
            }

            var timeInAnim = (elapsedTime % 1000)/1000;



            currentAnimCurve = Math.floor(elapsedTime/animationSpeed);
            if(currentAnimCurve == curves.length)
                currentAnimCurve = 0;

            var nextAnimCurve = currentAnimCurve+1;
            if(nextAnimCurve == curves.length)
                nextAnimCurve = 0;
            console.log(timeInAnim + " "+currentAnimCurve+" "+nextAnimCurve)

            var tCurve = LerpCurve(curves[currentAnimCurve], curves[nextAnimCurve], timeInAnim);
            DrawCurve(tCurve);
        }
    }


    // show canvas code
    function ShowCode() {
        var code =
            "curveWidth:" + style.curve.width + "\n";
        for (i = 0; i < curves.length; i++) {
            point = curves[i];
            code += point.p1.x + ", " + point.p1.y + ", " + point.cp1.x + ", " + point.cp1.y + ", " + point.cp2.x + ", " + point.cp2.y + ", " + point.p2.x + ", " + point.p2.y + ",\n";
        }
        $("#printCodeDialog").dialog("open");
        $("#printCodeDialogText").val(code);
    }


    function LoadCode() {
        $("#dialog").dialog("open");
    }


    // start dragging
    function DragStart(e) {
        var whichButton = e.which;
        if (whichButton == 3 || whichButton == 2) {
            e.preventDefault();
        }
        var ctrlPressed = e.ctrlKey;
        e = MousePos(e);
        var dx, dy;
        for (var i = 0; i < curves.length; i++) {

            selectedPoint = curves[i];

            for (var p in selectedPoint) {
                dx = selectedPoint[p].x - e.x;
                dy = selectedPoint[p].y - e.y;
                if ((dx * dx) + (dy * dy) < selectionRadius * selectionRadius) {
                    if (whichButton == 2 || whichButton == 3) {
                        selectedBezier = curves[i];
                        translatingObject = true;
                        dPoint = e;
                        canvas.style.cursor = "move";
                        return;
                    }

                    if (deleteMode) {
                        if (p == "p1" || p == "p2") {
                            curves.splice(i, 1);
                        } else {
                            return;
                        }
                    }
                    drag = p;
                    dPoint = e;
                    canvas.style.cursor = "move";
                    isSnapped = false;


                    var movepoint = (drag + "").length > 2 ? drag.substring(1) : drag;
                    for (i = 0; i < curves.length; i++) {
                        tPoint = curves[i];
                        if (tPoint == selectedPoint) continue;
                        if (selectedPoint[movepoint].computeDistance(tPoint.p1) <= selectionRadius) {
                            isSnapped = snapping.checked;
                            selectedBezier = selectedPoint;
                        } else if (selectedPoint[movepoint].computeDistance(tPoint.p2) <= selectionRadius) {
                            isSnapped = snapping.checked;
                            selectedBezier = selectedPoint;
                        }
                    }

                    return;
                }
            }
        }
        if (whichButton == 2 || whichButton == 3) {
            translating = true;
            dPoint = e;
            canvas.style.cursor = "move";
        }
    }

    var translating = false;
    var translatingObject = false;
    var selectedBezier = null;
    var isSnapped = false;

    // dragging
    function Dragging(e) {
        var i, tPoint;
        if (translating) {
            e = MousePos(e);
            for (i = 0; i < curves.length; i++) {
                tPoint = curves[i];
                tPoint.p1.x += e.x - dPoint.x;
                tPoint.p1.y += e.y - dPoint.y;
                tPoint.p2.x += e.x - dPoint.x;
                tPoint.p2.y += e.y - dPoint.y;
                tPoint.cp1.x += e.x - dPoint.x;
                tPoint.cp1.y += e.y - dPoint.y;
                tPoint.cp2.x += e.x - dPoint.x;
                tPoint.cp2.y += e.y - dPoint.y;
            }
            canvas.style.cursor = "move";
            DrawCanvas();
            dPoint = e;
            return;
        }

        if (translatingObject) {
            e = MousePos(e);
            tPoint = selectedBezier;
            tPoint.p1.x += e.x - dPoint.x;
            tPoint.p1.y += e.y - dPoint.y;
            tPoint.p2.x += e.x - dPoint.x;
            tPoint.p2.y += e.y - dPoint.y;
            tPoint.cp1.x += e.x - dPoint.x;
            tPoint.cp1.y += e.y - dPoint.y;
            tPoint.cp2.x += e.x - dPoint.x;
            tPoint.cp2.y += e.y - dPoint.y;
            canvas.style.cursor = "move";
            DrawCanvas();
            dPoint = e;
            return;
        }

        if (drag) {
            e = MousePos(e);
            if (isSnapped) {
                if (drag == "p1" || drag == "p2") {
                    for (i = 0; i < curves.length; i++) {
                        tPoint = curves[i];
                        if (tPoint == selectedPoint) continue;
                        var lockedPoint = "";
                        if (selectedPoint[drag].computeDistance(tPoint.p1) <= selectionRadius) {
                            lockedPoint = "p1";
                        } else if (selectedPoint[drag].computeDistance(tPoint.p2) <= selectionRadius) {
                            lockedPoint = "p2";
                        }

                        if (lockedPoint !== "") {
                            tPoint[lockedPoint].x += e.x - dPoint.x;
                            tPoint[lockedPoint].y += e.y - dPoint.y;
                            if (lockedPoint == "p1" || lockedPoint == "p2") {
                                tPoint["c" + lockedPoint].x += e.x - dPoint.x;
                                tPoint["c" + lockedPoint].y += e.y - dPoint.y;
                            }
                        }
                    }
                }
            }

            selectedPoint[drag].x += e.x - dPoint.x;
            selectedPoint[drag].y += e.y - dPoint.y;
            if (drag == "p1" || drag == "p2") {
                selectedPoint["c" + drag].x += e.x - dPoint.x;
                selectedPoint["c" + drag].y += e.y - dPoint.y;
            }

            dPoint = e;
            DrawCanvas();
        } else {
            e = MousePos(e);
            canvas.style.cursor = "default";

            for (i = 0; i < curves.length; i++) {
                tPoint = curves[i];
                if (tPoint.p1.computeDistance(e) <= selectionRadius || tPoint.p2.computeDistance(e) <= selectionRadius || (!deleteMode && (tPoint.cp1.computeDistance(e) <= selectionRadius || tPoint.cp2.computeDistance(e) <= selectionRadius))) {
                    canvas.style.cursor = deleteMode ? "crosshair" : "move";
                }
            }
        }
    }



    // end dragging
    function DragEnd(e) {
        translating = false;
        translatingObject = false;
        if (drag && snapping.checked) {
            if (drag == "p1" || drag == "p2") {
                for (var i = 0; i < curves.length; i++) {
                    tPoint = curves[i];
                    if (tPoint == selectedPoint) continue;
                    if (selectedPoint[drag].computeDistance(tPoint.p1) <= selectionRadius) {
                        selectedPoint[drag].x = tPoint.p1.x;
                        selectedPoint[drag].y = tPoint.p1.y;
                    } else if (selectedPoint[drag].computeDistance(tPoint.p2) <= selectionRadius) {
                        selectedPoint[drag].x = tPoint.p2.x;
                        selectedPoint[drag].y = tPoint.p2.y;
                    }


                }
            }
        }
        drag = null;
        DrawCanvas();
    }


    // event parser
    function MousePos(event) {
        event = (event ? event : window.event);
        return {
            x: event.pageX - canvas.offsetLeft,
            y: event.pageY - canvas.offsetTop
        };
    }

    var url, img, f, src;

    function fileSelected(event) {
        img = new Image();
        f = document.getElementById("uploadimage").files[0];
        url = window.URL || window.webkitURL;
        src = url.createObjectURL(f);

        img.src = src;
        img.onload = function () {
            DrawCanvas();
            url.revokeObjectURL(src);
        };
    }

    // start
    canvas = document.getElementById("canvas");
    snapping = document.getElementById("snappingEnabled");

    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    }, false);

    document.getElementById("animateBut").addEventListener("click", animate, false);
    document.getElementById("showCodeBut").addEventListener("click", ShowCode, false);
    document.getElementById("loadCodeBut").addEventListener("click", LoadCode, false);
    document.getElementById("addCurveBut").addEventListener("click", addCurve, false);
    document.getElementById("delCurveBut").addEventListener("click", delCurve, false);
    document.getElementById("uploadimage").addEventListener("change", fileSelected, false);
    if (canvas.getContext) {
        ctx = canvas.getContext("2d");
        Init();

        setInterval(DrawCanvas, 50);
    }

    $("#dialog").dialog({
        autoOpen: false,
        buttons: {
            Load: function () {
                curves = [];

                var splitCode = $("#loadData").val().split("\n");

                for (var i = 0; i < splitCode.length; i++) {
                    if (splitCode[i].indexOf("curve:") === 0) {
                        var tCurve = new curve();
                        tCurve.set(splitCode[i]);
                        if (tCurve.isValid) curves.push(tCurve);
                    } else if (splitCode[i].indexOf("curveWidth:") === 0) {
                        document.getElementById("strokeWidth").value = splitCode[i].substring(11);
                    } else {
                        var tCurve = new curve();
                        tCurve.set(splitCode[i]);
                        if (tCurve.isValid) curves.push(tCurve);
                    }

                }

                DrawCanvas();



                $(this).dialog("close");
            },
            Cancel: function () {
                $(this).dialog("close");
            }
        }
    });

    $("#printCodeDialog").dialog({
        autoOpen: false
    });

})();
