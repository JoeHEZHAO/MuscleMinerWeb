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
});