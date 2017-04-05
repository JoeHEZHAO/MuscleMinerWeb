import os, sys
import shutil
from skimage import io
import json
import deepzoom
import cv2
from flask import jsonify
import drawcontour

fuse = io.imread(os.path.join(imgpath, imgname))
im=[]
print "fuse shape:",fuse.shape

mask = 1 - fuse.copy()
size_threshold = 0
fg_threshold = 0.70
solidity = 1.0
mask_postprocess = drawcontour.post_processing(
    mask, size_threshold=size_threshold,
    fg_threshold=fg_threshold, solidity=solidity)

res = drawcontour.mask2contour(im, mask_postprocess,
    color = [0,0,255] , linewidth= 2, border_dist=5)

res_json = res.get_data()
with open('contour.json', 'w') as outfile:
    json.dump(res_json, outfile, indent=4, ensure_acsii=False)

return res