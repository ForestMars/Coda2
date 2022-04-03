# api.py -
__version__ = '0.1'
__all__ = ['layout', 'callback']

import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output

layout = html.Div([
    html.Br(),
    html.H3('Cross Validation'),
    html.P("(See Hyperparamter API)"),
],
style={'padding':'10vw'}
)

def callback(app):
    pass
