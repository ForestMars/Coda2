# index.py - dynamic routing module for covid data tools (server.py)
#breakpoint()
__version__ = '0.2'
__all__ = ['layout', 'callback']

import os
import sys

import dash
from dash import Dash
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output

from assets import menu
from common import utils
from common.logger import Log as log

import warnings
warnings.filterwarnings('ignore')


APPS_DIR = 'apps'

app_modules = utils.get_reg_files(APPS_DIR)  # Dynamically load all modules in a given directory
routes = {'/' : 'about.layout'}  # Initialise route table


for route in app_modules:
    route = os.path.splitext(route)[0]
    #exec("from apps import %s" % route)  # bane of error handling.
    exec("from apps import {}".format(route))  # bane of error handling.
    routes['/' + route] = route + '.layout'

def app_server(app, debug: bool=False) -> None:

    app = Dash(server=app)
    app.config.suppress_callback_exceptions = True

    app.layout = html.Div([
        menu.get_header(),
        menu.get_menu(),
        dcc.Location(id='url', refresh=False),
        html.Div(id='index')
    ],
    id='maindiv'
    )
    @app.callback(Output('index', 'children'),
                  [Input('url', 'pathname')])
    def display_page(path):
        if path is not None:
            return eval(routes.get(path))
        return '404' # Rover.

    callbacks(app)

    return app.server

# @TODO: Needs to be a generator, not a list.
breakpoint()
def callbacks(app) -> None:
    ask.callback(app)
    data.data_callback(app) # wtf
    #distancing.callback(app)
    explore.callback(app)
    model.callback(app)
    predict.callback(app)
    simulation.callback(app)
    world.callback(app)
    world_updated.callback(app)

    #multitrace.callback(app)
    #scatterplot.callback(app)
