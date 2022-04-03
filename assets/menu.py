# menu.py - module to dynamically generate header menu.
__version__ = '0.1'
__all__ = ['get_header', 'get_menu']

import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output

import common.utils as utils

APPS_DIR = 'apps'
app_modules = utils.get_menu_items(APPS_DIR)

links = [ mod.split('.')[0] for mod in app_modules ]
paths = [ '/' + link for link in links ]
path_links = dict(zip(paths, links))

def get_header():
    header = html.Div([
        dcc.Link(
            html.Div([
                html.H2('Covid Data Tools')
                ],
                id='main-title',
                style={'text-align': 'center', 'margin-bottom':0, 'padding-top':'3px', 'background': 'url(assets/img/social_circles.jpg)', 'background-position':'0 -20px', 'background-color':'#f4f4f2', 'margin-bottom':0, 'word-spacing':'.05em', 'letter-spacing':'.05em', 'font-family':'Undeka', '-webkit-font-smoothing':'antialiased', '-moz-osx-font-smoothing':'grayscale', 'text-rendering':'optimizeLegibility', 'font-weight':'bold', 'text-transform':'none'},
                ),
        href='/.',),
    ], #style={'line-height':'100%', 'position':'relative' },
)
    return header

def get_menu():
    menu_items = [ dcc.Link(link.capitalize(), href=path, className="p-2 text-dark") for path, link in path_links.items() ]
    menu = html.Div(
        menu_items,
        id='themenu',
        className="d-flex flex-column flex-md-row align-items-center p-3 px-md-4 mb-3 bg-white border-bottom shadow-sm",
        style={'margin-top':0, 'margin-bottom':0, 'line-height':'8px', 'background-color':'#fdfefd'}
        )

    return menu
