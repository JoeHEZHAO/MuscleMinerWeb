MuscleMinerJS
======================

<table align="center">
					<!-- seg, detect and search boxes start-->
					<tr>
						<!-- segmentation  -->
						<td style="text-align:center;white-space:nowrap">
							<form id="frmsegment" action="{{ url_for('segmentation') }}" align="center" method=post enctype=multipart/form-data>
								<div style="list-style-type:none"><input type="image" class="circle_image" src="{{ url_for('static', filename = 'icons/segmentation_icon.png') }}" border="0" alt="Submit"></div>
								<div style="list-style-type:none" ><input id="btnSegment" type="button"   value="Segmentation" class="bt-function"></div>
							</form>
						</td>
						<!-- segmentation ends -->
					</tr>
					<!-- seg, detect and search boxes end -->
</table>