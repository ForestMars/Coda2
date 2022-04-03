# run.py # app.py will be loaded instead if it exists which it deesn't and for good reason.
__version__ = '0.1'
__all__ = ['app_init']

import os
from flask import Flask as beaker
from dash import Dash

import server


ENV_PORT = os.environ['PORT']

app = beaker(__name__)


def app_init(app):

    with app.app_context():
        from api import routes

        from server import app_server
        app = app_server(app)

        return app


# Look mom, no middlewarez!
if __name__ == '__main__':

    app = app_init(app)
    #server.app_server(app)

    #run.app_server(app, debug=True) # app.run_server(debug=True)
    app.run(debug=True, port=ENV_PORT)
    #app.run_server(debug=True)
