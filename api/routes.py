import json
import pickle
import sys

from flask import current_app as app
from flask import request
import pandas as pd

from lib.predict_data import get_traces_rf


@app.route('/')
def index():
    # from assets return home. #JustSaying.
    # from assets import home
    # return home
    return '<link type="text/css" rel="stylesheet" href="./assets/style.css" /><style>.container {height: 400px; position:relative;} .vertical-center {margin: 0; position: absolute; top: 50%; left: 50%; -ms-transform: translateY(-50%, -50%); transform: translateY(-50%, -50%);}</style><body style="background: url(assets/img/social_circles.jpg) no-repeat center center fixed; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; background-size: cover;height:100%; "><div class="container"><div class="vertical-center" style="position:absolute;"><div id="title-box" style="background-color: rgba(177,222,0,0.33); height: 200px; padding: 22px; border: 3px solid #336633; -moz-box-shadow: 3px 3px 5px 6px #231; -webkit-box-shadow: 3px 3px 5px 6px #231; box-shadow: 3px 3px 5px 6px #231;" class="shadow">   <H3 style="top:133px;left:5%; position:absolute; color:#FFD; font-family:Undeka; font-weight:bold; text-transform:uppercase; ">      Covid Data Tools        for Epidemiological Analysis</H3>   <H1 style="color:#FFD; text-transform: uppercase; font-family:FranklinG; letter-spacing:.04em; font-weight:bold; top:50px; left:5%; position:absolute">Coda.to</H1><H3 style="color:#FFD; font-family:Gill-sans; font-weight:bold; text-transform:uppercase; top:122px; left:5% position:absolute; min-width:505px;"></H3></div></div></div></body>'
    return "Congratulations you've found the secret message. With great power comes "

@app.route('/home')
def home():
    # from assets return home. #JustSaying.
    from assets.templates import home
    return home
    return "Congratulations you've found the secret message. With great power comes great something... "

@app.route('/terms-of-use')
def terms():
    return "<H2>Coda.to Homepage</h2><p>COvid DAta TOols for Epidemiological Analysis"

@app.route('/privacy-policy')
def privacy():
    return "<H2>Coda.to Homepage</h2><p>COvid DAta TOols for Epidemiological Analysis"

@app.route('/sitemap')
def sitemap():
    return "<H2>Coda.to Homepage</h2><p>COvid DAta TOols for Epidemiological Analysis"

@app.route('/api/v1/boo',  methods = ['POST'])
def boo():
    handle_boo(request.form['foo'], request.form['bar'])
    return "boo."

@app.route('/api/v1/get_traces',  methods = ['POST'])
def get_traces():
    data = request.form['dfjson']

    df = pd.read_json(request.form['dfjson'])
    trace_regions = json.loads(request.form['trace_regions'])
    traces = get_traces_rf(df, request.form['train_days'], trace_regions)
    pickled_traces = pickle.dumps(traces)

    return pickled_traces
