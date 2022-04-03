# home.py - app module for Codato home page.
__version__ = '0.1'
__all__ = ['layout', 'callback']

import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output

layout = html.Div([
    html.Br(),
    html.H3('Covid Data Tools'),
],
style={'padding':'10vw', 'text-align':'center'}
)

def callback(app):
    pass
