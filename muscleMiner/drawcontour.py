# -*- coding: utf-8 -*-
"""
Created on Wed May  4 15:04:35 2016

@author: fujunl
"""

import numpy as np
import cv2
#import numpy as np
import scipy
import matplotlib.pyplot as plt
from scipy import ndimage
from skimage import color, measure, morphology
from PIL import Image
import glob
import os
from flask import jsonify

class myobj(object):
    pass

def imshow(img):
    plt.figure()
    plt.imshow(img)
    plt.show()

def overlayImg_(img, mask,print_color = [5,119,72],linewidth= 1, alpha = 0.618):
    #img = img_as_float(data.camera())
    img[mask==1] =  print_color
    return img
def deprecated_overlayImg_(img, mask,print_color = [5,119,72],linewidth= 1, alpha = 0.618):
    #img = img_as_float(data.camera())
    rows, cols = img.shape[0:2]
    # Construct a colour image to superimpose
    color_mask = np.zeros((rows, cols, 3))
    color_mask[mask == 1] = print_color
    color_mask[mask == 0] = img[mask == 0]
    # imshow(color_mask)

    if len(img.shape) == 2:
       img_color = np.dstack((img, img, img))
    else:
       img_color = img

    img_hsv = color.rgb2hsv(img_color)
    color_mask_hsv = color.rgb2hsv(color_mask)

    img_hsv[..., 0] = color_mask_hsv[..., 0]
    img_hsv[..., 1] = color_mask_hsv[..., 1] * alpha

    img_masked = color.hsv2rgb(img_hsv)
    # Display the output
    #f, (ax0, ax1, ax2) = plt.subplots(1, 3,
    #                                  subplot_kw={'xticks': [], 'yticks': []})
    #ax0.imshow(img, cmap=plt.cm.gray)
    #ax1.imshow(color_mask)
    #ax2.imshow(img_masked)
    #plt.show()

    img_masked = np.asarray((img_masked/np.max(img_masked) ) * 255, dtype = np.uint8)

    return img_masked



def mask2contour(org, mask, **kwargs):
    '''org are original reference image to be overlaid.
       mask should be binary image, anyway I will modify it using 100 as threshold to binarize it.

       if org, and mask are file names, then we read them
       if mask is numpy array, then  0 at background, 1 at foreground.

       savepath: full path to save the image
       kwargs:
            color
            linewidth
    '''

    mask = mask.astype(int)
    #contour_mask  = np.zeros(mask.shape)

    param = myobj()
    param.linewidth = 2
    param.color = [5,119,72] #[0,0,255] #

    for key in kwargs:
        setattr(param, key, kwargs[key])


    #contours = measure.find_contours(mask, 0)

    #_,mask_tmp = cv2.threshold(mask, 0.5, 1,0)
    #print type(mask)
    # another version has three output
    #imgtmp, contours, tmp2 = cv2.findContours(mask.astype('uint8'), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    jcontours, tmp2 = cv2.findContours(mask.astype('uint8'), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    print 'length:', len(jcontours)

    #print len(contours)
    border_dist = param.border_dist
    imgH, imgW = mask.shape

    contours={}
    contours['Total']=len(jcontours)
    temp_contours=[]
    #print mask.shape
    for n, jcontour in enumerate(jcontours):
        #print mask.shape
        jcontour = np.squeeze(jcontour.astype(int))
        #print 'jcontour shape:',jcontour.shape
        if len(jcontour.shape) < 2:
            # print contour
            continue

        #print contour
        min_y, max_y = np.min(jcontour[:,1]), np.max(jcontour[:,1])
        min_x, max_x = np.min(jcontour[:,0]), np.max(jcontour[:,0])

        if min_y < border_dist or min_x < border_dist \
            or (imgH-max_y-1) < border_dist or (imgW-max_x-1) < border_dist:
            continue

        points=[]

        contour = {}
        contour['length'] = jcontour.shape[0]
        print 'contour length:', jcontour.shape[0]
        for i, c in enumerate(jcontour):

            points.append({
                'x' : c[1],
                'y' : c[0]
            })
        print 'Added points:', len(points)
        contour['points'] = points

        temp_contours.append(contour)
        print 'iteration for contours : ',n
            #plt.plot(contour[:, 1], contour[:, 0], linewidth=2)
            #contour_mask[contour[:, 1], contour[:, 0]] = 1

    contours['contours']=temp_contours
    #contour_mask[0,:] = 0
    #contour_mask[-1,:] = 0
    #contour_mask[:,0] = 0
    #contour_mask[:,-1] = 0

    # dialte the image based on linewidth
    #se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(param.linewidth, param.linewidth))
    #contour_mask = cv2.dilate(contour_mask,se)

    #return overlayImg_(org, contour_mask , print_color = param.color, linewidth = param.linewidth, alpha = 0.8)

    return jsonify(contours)


def post_processing(mask, **kwargs):
    print "in the post processing phase"
    param = myobj()
    for key in kwargs:
        setattr(param, key, kwargs[key])

    #print np.max(mask), np.min(mask)
    print np.max(mask)
    if np.max(mask) > 1:
        mask = 1.0*mask/np.max(mask)

    #mask = 1.0 - mask
    if hasattr(param, 'fg_threshold'):
        print param.fg_threshold
        mask = mask > param.fg_threshold
    else:
        mask = mask > 0


    if hasattr(param, 'size_threshold'):
        print param.size_threshold
        mask = morphology.remove_small_objects(mask, param.size_threshold)

    if hasattr(param, 'solidity') and param.solidity < 1.0:
        regions = measure.regionprops(measure.label(mask))
        for props in regions:
            if props.solidity < param.solidity:
                coords = props.coords
                mask[coords[:,0], coords[:,1]] = 0

    #mask = ndimage.binary_fill_holes(mask, structure=np.ones((7,7)))
    return mask

if __name__ == '__main__':
    '''
    org and mask can be numpy array or file path.
    mask should be 1 at foreground and 0 at background.
    '''
    data_dir = 'test/big'#'MusleImgsForDemo'
    result_dir = 'results'
    img_all = glob.glob(data_dir + '/*bmp')
    size_thresholds = [1000]#np.arange(0,500,100).tolist()
    fg_thresholds = [0.65]#np.arange(0.6,0.8,0.05).tolist()
    solidity = 0.9
    for img_path in img_all:
        org = np.asarray(Image.open(img_path))
        img_name = os.path.split(img_path)[-1]
        mask = np.asarray(Image.open(data_dir + '/' + img_name + '.png'))

        for size_threshold in size_thresholds:
            for fg_threshold in fg_thresholds:
                result_tag = '{}_{}'.format(fg_threshold, size_threshold)
                # do some post processing here
                #mask0 = mask > 255.0*fg_threshold
                #Image.fromarray((mask0*255).astype('uint8')).save(result_dir + '/' + img_name + '_' + result_tag + 'mask0.png')
                mask = post_processing(mask, size_threshold=size_threshold, fg_threshold=fg_threshold, solidity=solidity)
                Image.fromarray((mask*255).astype('uint8')).save(result_dir + '/' + img_name + '_' + result_tag + 'mask1.png')

                contour_img = mask2contour(org, mask, color = [0,0,1], linewidth=4, border_dist=5)

                sub_dir = result_dir + '/' + result_tag
                if not os.path.exists(sub_dir):
                    os.makedirs(sub_dir)
                Image.fromarray(contour_img).save(result_dir + '/' + img_name + '_seg.png')
