#!/usr/bin/env python
import os, sys, time
from flask import Flask, url_for, render_template, make_response
from flask import redirect, request, send_file, jsonify
from werkzeug import secure_filename
from util import dosegmentation, createdz
from util import delete_files, check_file_size

from io import BytesIO
import openslide
from openslide import ImageSlide, open_slide
from openslide.deepzoom import DeepZoomGenerator
from optparse import OptionParser
from unicodedata import normalize
import re, glob, json, base64


DEEPZOOM_SLIDE = None
DEEPZOOM_FORMAT = 'jpeg'
DEEPZOOM_TILE_SIZE = 512
DEEPZOOM_OVERLAP = 1
DEEPZOOM_LIMIT_BOUNDS = True
DEEPZOOM_TILE_QUALITY = 75
SLIDE_NAME = 'slide'


# Initialize Flaks instance
app = Flask(__name__)
sys.path.insert(0,'.')
sys.path.append('./templates')

GLOBAL_FILE_NAME = '' # Processing image name
app.config['GLOBAL_FILE_NAME'] = GLOBAL_FILE_NAME
app.config['WAIT_TIME'] = 5
# where you save the upload images
app.config['UPLOAD_FOLDER'] = 'static/files/upload_data/'
if not os.path.isdir(app.config['UPLOAD_FOLDER']):
    os.mkdir(app.config['UPLOAD_FOLDER'])
# where you save the dzi for segmentation
app.config['SAVE_FOLDER_segmentation'] = 'static/files/segmentation_data/'
if not os.path.isdir(app.config['SAVE_FOLDER_segmentation']):
    os.mkdir(app.config['SAVE_FOLDER_segmentation'])
# where you save the dzi for detection
app.config['SAVE_FOLDER_detection'] = 'static/files/detection_data/'
if not os.path.isdir(app.config['SAVE_FOLDER_detection']):
    os.mkdir(app.config['SAVE_FOLDER_detection'])

class PILBytesIO(BytesIO):
    def fileno(self):
        '''Classic PIL doesn't understand io.UnsupportedOperation.'''
        raise AttributeError('Not supported')

ALLOWED_EXTENSIONS = set(['png', 'jpg', 'jpeg', 'tif', 'bmp'])
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()

def load_slide(name):
    slidefile = app.config['DEEPZOOM_SLIDE']
    if slidefile is None:
        raise ValueError('No slide file specified')
    config_map = {
        'DEEPZOOM_TILE_SIZE': 'tile_size',
        'DEEPZOOM_OVERLAP': 'overlap',
        'DEEPZOOM_LIMIT_BOUNDS': 'limit_bounds',
    }
    # opts = dict((v, app.config[k]) for k, v in config_map.items())
    slide = open_slide(slidefile)
    app.slides = {
        name: DeepZoomGenerator(slide)
    }

@app.route('/shutdown', methods=['POST'])
def shutdown():
    shutdown_server()
    return 'Server shutting down...'

@app.route('/segmentation', methods=['GET', 'POST'])
def segmentation():
    # image should be uploaded and segmentation request be sent
    print "working here"
    if request.method == 'POST':
        # getting name info
        filename = 'seg_bg.bmp'
        prefix = filename[:-3]
        try:
            # do segmentation\\
            filename = prefix + 'png'
            print filename
            result = dosegmentation(app.config['SAVE_FOLDER_segmentation'],
                filename, app.config['SAVE_FOLDER_segmentation'] )
            return result
        except Exception as exc:
            print 'error in loading data ', filename
            print exc
            result={}
            result["error"]=1
            return jsonify(result)

# Assume Whole slide images are placed in folder slides
@app.route('/slides/', defaults={'filename': None})
@app.route('/slides/<filename>')
def getslides(filename):
    if filename == None:
        # Get all Whole slide microscopy images
        ALLOWED_EXTENSIONS = set(['svs', 'ndpi','jpg','bmp', 'png'])
        filelists = []
        cur_path = os.getcwd()
        for ext in ALLOWED_EXTENSIONS:
            filelists.extend(glob.glob(os.path.join(cur_path, 'slides', '*.' + ext)))
        # setting obj configs
        obj_config = {}
        # set tile_sources and names
        tile_sources = []
        names = []
        for ind, filepath in enumerate(filelists):
            head, tail = os.path.split(filepath)
            tile_sources.append('slides/'+tail)
            names.append(ind)
        obj_config['tileSources'] = tile_sources
        obj_config['names'] = names
        # set configuration and pixelsPermeter
        obj_config['configuration'] = None
        obj_config['pixelsPerMeter'] = 1

        app.config["Files"] = obj_config

        return jsonify(obj_config)
    else:
        # app.config['DEEPZOOM_SLIDE'] = './slides/105357.svs'
        app.config['DEEPZOOM_SLIDE'] = './slides/'+filename
        name, ext = os.path.splitext(filename)
        load_slide(name)
        slide_url = url_for('dzi', slug=name)
        return slide_url

@app.route('/<slug>.dzi')
def dzi(slug):
    format = 'jpeg'
    try:
        resp = make_response(app.slides[slug].get_dzi(format))
        resp.mimetype = 'application/xml'
        return resp
    except KeyError:
        # Unknown slug
        abort(404)

@app.route('/<slug>_files/<int:level>/<int:col>_<int:row>.<format>')
def tile(slug, level, col, row, format):
    format = format.lower()
    if format != 'jpeg' and format != 'png':
        # Not supported by Deep Zoom
        abort(404)
    try:
        tile = app.slides[slug].get_tile(level, (col, row))
    except KeyError:
        # Unknown slug
        abort(404)
    except ValueError:
        # Invalid level or coordinates
        abort(404)
    buf = PILBytesIO()
    tile.save(buf, format, quality=75)
    resp = make_response(buf.getvalue())
    resp.mimetype = 'image/%s' % format
    return resp

@app.route('/')
def index():
    return render_template("entry.html", path = '')

if __name__ == '__main__':
    app.run(host= '0.0.0.0', port=60000, debug=True)
