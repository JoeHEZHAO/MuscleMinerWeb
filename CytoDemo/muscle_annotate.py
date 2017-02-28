# @Author: Pingjun Chen <Pingjun>
# @Date:   2017-01-31T12:38:21-05:00
# @Email:  codingPingjun@gmail.com
# @Filename: muscle_annotate.py
# @Last modified by:   Pingjun
# @Last modified time: 2017-02-06T23:00:43-05:00
# @License: The MIT License (MIT)
# @Copyright: Lab BICI2. All Rights Reserved.


from flask import Flask, abort, make_response, render_template, url_for,send_from_directory
from flask import jsonify,request
from io import BytesIO
import openslide
from openslide import ImageSlide, open_slide
from openslide.deepzoom import DeepZoomGenerator
from optparse import OptionParser
from unicodedata import normalize
import os, re, glob, json, base64


DEEPZOOM_SLIDE = None
DEEPZOOM_FORMAT = 'jpeg'
DEEPZOOM_TILE_SIZE = 512
DEEPZOOM_OVERLAP = 1
DEEPZOOM_LIMIT_BOUNDS = True
DEEPZOOM_TILE_QUALITY = 75
SLIDE_NAME = 'slide'

# create flask object
app = Flask(__name__)
app.config.from_object(__name__)
app.config.from_envvar('DEEPZOOM_TILER_SETTINGS', silent=True)
app.debug = True
app.config["Files"] = None
app.config["ANNOTATION_DIR"] = "./static/Annotations/"


class PILBytesIO(BytesIO):
    def fileno(self):
        '''Classic PIL doesn't understand io.UnsupportedOperation.'''
        raise AttributeError('Not supported')

def load_slide(name):
    slidefile = app.config['DEEPZOOM_SLIDE']
    if slidefile is None:
        raise ValueError('No slide file specified')
    config_map = {
        'DEEPZOOM_TILE_SIZE': 'tile_size',
        'DEEPZOOM_OVERLAP': 'overlap',
        'DEEPZOOM_LIMIT_BOUNDS': 'limit_bounds',
    }
    opts = dict((v, app.config[k]) for k, v in config_map.items())
    slide = open_slide(slidefile)
    app.slides = {
        name: DeepZoomGenerator(slide, **opts)
    }

@app.route('/uploadinfo', methods=['POST'])
def uploadinfo(): # check for post data
    info_all = {}
    if request.method == "POST":
        # image name
        img_idx = int(request.form['imageidx'])
        img_path = app.config["Files"]['tileSources'][img_idx]
        img_name = os.path.splitext(os.path.basename(img_path))[0]
        info_all["img_name"] = img_name
        # diagnosis result
        diag_res = str(request.form['diagnosis'])
        info_all["diag_res"] = diag_res
        # parse contour information, get useful part
        contour_info = json.loads(request.form['info'])
        region_info_all = []
        for ireg in range(len(contour_info['Regions'])):
            cur_region_info = {}
            cur_region = contour_info['Regions'][ireg]
            cur_region_info['uid'] = cur_region['uid']
            cur_region_info['region_name'] = "region" + str(cur_region['uid'])
            cur_region_info['points'] = cur_region['contour']['Points']
            region_info_all.append(cur_region_info)
        info_all["region_info"] = region_info_all

        # saving contours information
        if not os.path.exists(app.config["ANNOTATION_DIR"]):
            os.makedirs(app.config["ANNOTATION_DIR"])
        img_path = os.path.join(app.config["ANNOTATION_DIR"], img_name)
        if not os.path.exists(img_path):
            os.makedirs(img_path)

        # saving
        info_all_name = "annotations.json"
        info_path = os.path.join(img_path, info_all_name)
        if os.path.exists(info_path):
            os.remove(info_path)
        with open(info_path, 'w') as fp:
            json.dump(info_all, fp)
        return "success"
    else:
        return "error"

@app.route('/uploadmp3', methods=['POST'])
def uploadmp3(): # check for post data
    if request.method == "POST":
        # image name
        img_idx = int(request.form['imageidx'])
        img_path = app.config["Files"]['tileSources'][img_idx];
        img_name = os.path.splitext(os.path.basename(img_path))[0]
        # region id
        uid = str(request.form['uid'])
        # mp3 data
        encode_audio = request.form['data']
        # folder if not exist then create for the image
        if not os.path.exists(app.config["ANNOTATION_DIR"]):
            os.makedirs(app.config["ANNOTATION_DIR"])
        img_path = os.path.join(app.config["ANNOTATION_DIR"], img_name)
        if not os.path.exists(img_path):
            os.makedirs(img_path)

        audio_filename = "region" + uid + ".mp3"
        audio_path = os.path.join(img_path, audio_filename)
        if os.path.exists(audio_path):
            os.remove(audio_path)
        # decode audio data

        # print(encode_audio)
        start_pos = encode_audio.index(',') + 1
        audio_data = base64.b64decode(encode_audio[start_pos:])
        try:
            fp = open(audio_path, 'wb')
            fp.write(audio_data)
            fp.close()
            return "success"
        except:
            return "error"
    else:
        return "error"


# Assume Whole slide images are placed in folder slides
@app.route('/slides/', defaults={'filename': None})
@app.route('/slides/<filename>')
def getslides(filename):
    if filename == None:
        # Get all Whole slide microscopy images
        ALLOWED_EXTENSIONS = set(['svs', 'ndpi', 'bmp', 'png'])
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

@app.route('/')
def index():
    return render_template('muscle_annotation.html')

@app.route('/<slug>.dzi')
def dzi(slug):
    format = app.config['DEEPZOOM_FORMAT']
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
    tile.save(buf, format, quality=app.config['DEEPZOOM_TILE_QUALITY'])
    resp = make_response(buf.getvalue())
    resp.mimetype = 'image/%s' % format
    return resp


def slugify(text):
    text = normalize('NFKD', text.lower()).encode('ascii', 'ignore').decode()
    return re.sub('[^a-z0-9]+', '-', text)


if __name__ == '__main__':
    parser = OptionParser(usage='Usage: %prog [options] [slide]')
    parser.add_option('-B', '--ignore-bounds', dest='DEEPZOOM_LIMIT_BOUNDS',
                default=True, action='store_false',
                help='display entire scan area')
    parser.add_option('-c', '--config', metavar='FILE', dest='config',
                help='config file')
    parser.add_option('-d', '--debug', dest='DEBUG', action='store_true',
                help='run in debugging mode (insecure)')
    parser.add_option('-e', '--overlap', metavar='PIXELS',
                dest='DEEPZOOM_OVERLAP', type='int',
                help='overlap of adjacent tiles [1]')
    parser.add_option('-f', '--format', metavar='{jpeg|png}',
                dest='DEEPZOOM_FORMAT',
                help='image format for tiles [jpeg]')
    parser.add_option('-l', '--listen', metavar='ADDRESS', dest='host',
                #default='10.244.13.112',
                default='127.0.0.1',
                help='address to listen on [127.0.0.1]')
    parser.add_option('-p', '--port', metavar='PORT', dest='port',
                type='int', default=10001,
                help='port to listen on [10001]')
    parser.add_option('-Q', '--quality', metavar='QUALITY',
                dest='DEEPZOOM_TILE_QUALITY', type='int',
                help='JPEG compression quality [75]')
    parser.add_option('-s', '--size', metavar='PIXELS',
                dest='DEEPZOOM_TILE_SIZE', type='int',
                help='tile size [254]')
    (opts, args) = parser.parse_args()

    # Load config file if specified
    if opts.config is not None:
        app.config.from_pyfile(opts.config)
    # Overwrite only those settings specified on the command line
    for k in dir(opts):
        if not k.startswith('_') and getattr(opts, k) is None:
            delattr(opts, k)
    app.config.from_object(opts)

    # run the program
    app.run(host=opts.host, port=opts.port, threaded=True)
