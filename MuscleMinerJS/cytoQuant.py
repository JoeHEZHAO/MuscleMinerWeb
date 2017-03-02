#!/usr/bin/env python
import os, sys, time
from flask import Flask, url_for, render_template
from flask import redirect, request, send_file, jsonify
from werkzeug import secure_filename
from util import dosegmentation, createdz
from util import delete_files, check_file_size

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

ALLOWED_EXTENSIONS = set(['png', 'jpg', 'jpeg', 'tif', 'bmp'])
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()

@app.route('/shutdown', methods=['POST'])
def shutdown():
    shutdown_server()
    return 'Server shutting down...'

@app.route('/segmentation', methods=['GET', 'POST'])
def segmentation():
    # image should be uploaded and segmentation request be sent
    if request.method == 'POST' and app.config['GLOBAL_FILE_NAME'] != '':
        # getting name info 
        filename = app.config['GLOBAL_FILE_NAME']
        prefix = filename[:-3]
        try:
            # do segmentation\\
            filename = prefix + 'png'
            result = dosegmentation(app.config['SAVE_FOLDER_segmentation'],
                filename, app.config['SAVE_FOLDER_segmentation'] )
            print filename
            print filename
            print filename
            print filename
            return result
        except Exception as exc:
            print 'error in loading data ', filename
            print exc
            result={}
            result["error"]=1
            return jsonify(result)


@app.route('/detection', methods=['GET', 'POST'])
def detection():
    if request.method == 'POST' and app.config['GLOBAL_FILE_NAME'] != '':
        # getting name info
        filename = app.config['GLOBAL_FILE_NAME']
        surfix = filename[-4:]
        perfix = filename[:-4]
        print '!!!!!', filename

        # TODO !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        #prob = dodetection(app.config['UPLOAD_FOLDER'], filename, \app.config['SAVE_FOLDER_detection'] )
        #generate detection result with deep zoom format
        dzipath = createdz(os.path.join(app.config['SAVE_FOLDER_detection'], filename))

        return render_template("entry.html", path = dzipath)
    return render_template("entry.html", path = '')


@app.route('/upload', methods=['GET', 'POST'])
def just_upload_file():
    if request.method == 'POST':
        # delete previous files
        delete_files(app.config['UPLOAD_FOLDER'])
        # delete_files(app.config['SAVE_FOLDER_segmentation'])
        delete_files(app.config['SAVE_FOLDER_detection'])

        file = request.files['file']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            print "---upload", file.filename
            # set GLOBAL_FILE_NAME
            app.config['GLOBAL_FILE_NAME'] = filename
            # save a copy to UPLOAD_FOLDER
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            # create dzifile
            dzipath = createdz(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            # if path != '', then exec editPaperSeg.js
            return render_template("entry.html", path = dzipath)
    return render_template("entry.html", path = '')

@app.route('/search', methods=['GET', 'POST'])
def search():
    return render_template("entry.html", path = '')

@app.route('/')
def index():
    return render_template("entry.html", path = '')

if __name__ == '__main__':
    app.run(host= '0.0.0.0', port=60000, debug=True)
