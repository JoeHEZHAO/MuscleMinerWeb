import os, sys
import shutil
from skimage import io
import json
import deepzoom
import cv2
from flask import jsonify
import drawcontour

def dodetection(imgpath, imgname, savepath):

    return res

def dosegmentation(imgpath, imgname, savepath):
    print "--------> do segmentation"

    json_path = os.path.join(imgpath, imgname)
    with open(json_path) as json_data:
        res = json.load(json_data) # res is text type file
    out = json.loads(res) # transform text and str type into object
    res = jsonify(out) # make python object a json object
    return res

    # fuse = io.imread(os.path.join(imgpath, imgname))
    # im=[]
    # print "fuse shape:",fuse.shape

    # mask = 1 - fuse.copy()
    # size_threshold = 0
    # fg_threshold = 0.70
    # solidity = 1.0
    # mask_postprocess = drawcontour.post_processing(
    #     mask, size_threshold=size_threshold,
    #     fg_threshold=fg_threshold, solidity=solidity)

    # res = drawcontour.mask2contour(im, mask_postprocess,
    #     color = [0,0,255] , linewidth= 2, border_dist=5)

    # res_json = res.get_data()
    # with open('contour.json', 'w') as outfile:
    #     json.dump(res_json, outfile, indent=4, ensure_acsii=False)

    # return res

def createdz(fullimgname, fullwritename=None):
    if fullwritename == None:
        fullwritename = fullimgname
    fullwritename = fullwritename[:-3]+'dzi'
    print "--------> create dz at ", fullwritename

    # Create Deep Zoom Image creator with weird parameters
    creator = deepzoom.ImageCreator(tile_size=512, tile_overlap=2,
        tile_format="jpg", image_quality=1, resize_filter="bicubic")
    # Create Deep Zoom image pyramid from source
    print("Now creating dzi from source:" + fullimgname)

    creator.create(fullimgname, fullwritename)
    print "-------> saved dzi at ", fullwritename
    print("Now return dzi to source:" + fullwritename)
    return fullwritename

def check_file_size(fullfilename):
    ## if size is too big. 3000*3000 is 27MB
    covert2mb = 1024 * 1024 # bytes convert to MB
    file_size = os.path.getsize(fullfilename) / covert2mb
    return file_size

def delete_files(folder):
    for root, dirs, files in os.walk(folder):
        for f in files:
            os.unlink(os.path.join(root, f))
        for d in dirs:
            shutil.rmtree(os.path.join(root, d))
